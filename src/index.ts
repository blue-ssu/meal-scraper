import { NoopMenuParser } from "./parsers/noopMenuParser";
import { GPTMenuParser } from "./parsers/gptMenuParser";
import { FoodScrapingService } from "./services/scrapingService";
import { FoodCrawlerSettings, defaultSettings } from "./config";
import { RawMenuData, DailyMenu, CafeteriaType } from "./domain";

export { FoodScrapingService } from "./services/scrapingService";
export { FoodCrawlerSettings, defaultSettings } from "./config";
export { CafeteriaType, RawMenuData, DailyMenu } from "./domain";
export {
  BaseCafeteriaException,
  HolidayException,
  MenuFetchException,
  MenuParseException,
} from "./errors";

export interface CreateLibraryOptions {
  settings?: Partial<FoodCrawlerSettings>;
  gptApiKey?: string;
}

export interface FoodCrawlerLibrary {
  scrapeRawMenu: (
    cafeteria: CafeteriaType,
    date: string,
  ) => Promise<RawMenuData>;
  scrapeParsedMenu: (
    cafeteria: CafeteriaType,
    date: string,
  ) => Promise<DailyMenu>;
}

export const createFoodCrawlerLibrary = (
  options: CreateLibraryOptions = {},
): FoodCrawlerLibrary => {
  const settings: FoodCrawlerSettings = {
    ...defaultSettings,
    ...options.settings,
  };

  const parser = options.gptApiKey
    ? new GPTMenuParser(options.gptApiKey)
    : new NoopMenuParser();
  const service = new FoodScrapingService(settings, parser);

  return {
    scrapeRawMenu: (cafeteria, date) => service.scrapeRawMenu(cafeteria, date),
    scrapeParsedMenu: (cafeteria, date) =>
      service.scrapeAndParseMenu(cafeteria, date),
  };
};

// 추가: 직접 함수 호출형 API
export const scrapeRawMenu = (
  cafeteria: CafeteriaType,
  date: string,
  options?: CreateLibraryOptions,
) => {
  return createFoodCrawlerLibrary(options).scrapeRawMenu(cafeteria, date);
};

export const scrapeParsedMenu = (
  cafeteria: CafeteriaType,
  date: string,
  options?: CreateLibraryOptions,
) => {
  return createFoodCrawlerLibrary(options).scrapeParsedMenu(cafeteria, date);
};
