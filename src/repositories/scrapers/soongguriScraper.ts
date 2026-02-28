import axios from "axios";
import { MenuScraper } from "../../interfaces";
import { CafeteriaType } from "../../domain";
import {
  BaseCafeteriaException,
  HolidayException,
  MenuFetchException,
} from "../../errors";
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

    try {
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
          {
            endpoint: url,
            operation: "scrape",
            cafeteria: this.cafeteriaType,
            timeoutMs: this.settings.timeoutMs,
          },
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
          {
            endpoint: url,
            operation: "parse",
            cafeteria: this.cafeteriaType,
            timeoutMs: this.settings.timeoutMs,
          },
        );
      }

      return {
        date,
        cafeteria: this.cafeteriaType,
        menuTexts: menus,
      };
    } catch (err) {
      if (err instanceof HolidayException) {
        throw err;
      }
      if (err instanceof BaseCafeteriaException) {
        throw err;
      }

      const raw = err as {
        status?: number;
        response?: { status?: number; statusText?: string };
      };
      const statusCode = raw?.status ?? raw?.response?.status;
      const statusText = raw?.response?.statusText;
      throw new MenuFetchException(
        date,
        this.cafeteriaType,
        "메뉴 수집 실패",
        err as unknown,
        {
          endpoint: url,
          cafeteria: this.cafeteriaType,
          statusCode,
          statusText,
          timeoutMs: this.settings.timeoutMs,
        },
      );
    }
  }
}

const normalizeSgDate = (date: string): string => {
  const digits = date.replace(/\D/g, "").slice(0, 8);
  return digits.length === 8 ? digits : date;
};
