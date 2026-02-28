import { MenuParser, MenuScraper } from "../interfaces";
import {
  CafeteriaStatus,
  createDailyMenu,
  DailyMenu,
  RawMenuData,
  CafeteriaType,
} from "../domain";
import {
  BaseCafeteriaException,
  HolidayException,
  MenuFetchException,
  MenuParseException,
} from "../errors";
import { HaksikScraper } from "../repositories/scrapers/haksikScraper";
import { DodamScraper } from "../repositories/scrapers/dodamScraper";
import { FacultyScraper } from "../repositories/scrapers/facultyScraper";
import { DormitoryScraper } from "../repositories/scrapers/dormitoryScraper";
import { FoodCrawlerSettings, defaultSettings } from "../config";

export class FoodScrapingService {
  constructor(
    private readonly settings: FoodCrawlerSettings = defaultSettings,
    private readonly parser: MenuParser,
  ) {}

  private createScraper(cafeteriaType: CafeteriaType): MenuScraper {
    if (cafeteriaType === CafeteriaType.HAKSIK) {
      return new HaksikScraper(this.settings);
    }
    if (cafeteriaType === CafeteriaType.DODAM) {
      return new DodamScraper(this.settings);
    }
    if (cafeteriaType === CafeteriaType.FACULTY) {
      return new FacultyScraper(this.settings);
    }
    if (cafeteriaType === CafeteriaType.DORMITORY) {
      return new DormitoryScraper(
        this.settings.dormitoryBaseUrl,
        this.settings.timeoutMs,
      );
    }
    throw new Error(`Unsupported cafeteria: ${cafeteriaType}`);
  }

  async scrapeRawMenu(
    cafeteriaType: CafeteriaType,
    date: string,
  ): Promise<RawMenuData> {
    try {
      const scraper = this.createScraper(cafeteriaType);
      return await scraper.scrapeMenu(date);
    } catch (err) {
      if (err instanceof BaseCafeteriaException) throw err;
      throw new MenuFetchException(
        date,
        cafeteriaType,
        "scrape 실패",
        err as unknown,
      );
    }
  }

  async scrapeAndParseMenu(
    cafeteriaType: CafeteriaType,
    date: string,
  ): Promise<DailyMenu> {
    try {
      const raw = await this.scrapeRawMenu(cafeteriaType, date);
      return await this.parse(raw);
    } catch (err) {
      if (err instanceof HolidayException) {
        return createDailyMenu(
          date,
          cafeteriaType,
          {
            breakfast: {},
            lunch: {},
            dinner: {},
          },
          CafeteriaStatus.Closed,
        );
      }
      throw err;
    }
  }

  private async parse(raw: RawMenuData): Promise<DailyMenu> {
    try {
      return await this.parser.parseMenu(raw);
    } catch (err) {
      if (err instanceof BaseCafeteriaException) throw err;
      throw new MenuParseException(
        raw.date,
        raw.cafeteria,
        "parse 실패",
        err as unknown,
      );
    }
  }
}
