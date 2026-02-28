import axios from "axios";
import { MenuScraper } from "../../interfaces";
import { CafeteriaType } from "../../domain";
import { HolidayException, MenuFetchException } from "../../errors";
import { FoodCrawlerSettings, getRcd } from "../../config";
import { parseTableToDict, stripStringFromDict } from "../../utils/parsing";

export class SoongguriScraper implements MenuScraper {
  constructor(
    private readonly settings: FoodCrawlerSettings,
    private readonly cafeteriaType: CafeteriaType,
  ) {}

  async scrapeMenu(date: string) {
    const normalizedDate = normalizeSgDate(date);
    const url = `${this.settings.soongguriBaseUrl}?rcd=${getRcd(this.cafeteriaType, this.settings)}&sdt=${normalizedDate}`;

    const res = await axios.get(url, {
      timeout: this.settings.timeoutMs,
      responseType: "text",
      validateStatus: (s) => s >= 200 && s < 300,
    });

    const html = String(res.data);
    const hasHoliday = html.includes("오늘은 쉽니다.") || html.includes("휴무");
    if (hasHoliday) {
      throw new HolidayException(
        date,
        this.cafeteriaType,
        "해당일은 휴무일입니다.",
        html,
      );
    }

    const parsed = parseTableToDict(html);
    const menus = stripStringFromDict(parsed);

    if (!Object.keys(menus).length) {
      throw new MenuFetchException(
        date,
        this.cafeteriaType,
        "메뉴를 찾지 못했습니다.",
        { menus, html },
      );
    }

    return {
      date,
      cafeteria: this.cafeteriaType,
      menuTexts: menus,
    };
  }
}

const normalizeSgDate = (date: string): string => {
  const digits = date.replace(/\D/g, "").slice(0, 8);
  return digits.length === 8 ? digits : date;
};
