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

export interface MealScraperOptions {
  settings?: Partial<FoodCrawlerSettings>;
  gptApiKey?: string;
}

export interface MealScraper {
  getRawMenu: (cafeteria: CafeteriaType, date: string) => Promise<RawMenuData>;
  getParsedMenu: (cafeteria: CafeteriaType, date: string) => Promise<DailyMenu>;
}

export const createMealScraper = (
  options: MealScraperOptions = {},
): MealScraper => {
  const settings: FoodCrawlerSettings = {
    ...defaultSettings,
    ...options.settings,
  };

  const parser = options.gptApiKey
    ? new GPTMenuParser(options.gptApiKey)
    : new NoopMenuParser();
  const service = new FoodScrapingService(settings, parser);

  return {
    getRawMenu: (cafeteria, date) => service.scrapeRawMenu(cafeteria, date),
    getParsedMenu: (cafeteria, date) =>
      service.scrapeAndParseMenu(cafeteria, date),
  };
};

export const getRawMenu = (
  cafeteria: CafeteriaType,
  date: string,
  options?: MealScraperOptions,
) => {
  return createMealScraper(options).getRawMenu(cafeteria, date);
};

export const getDailyMenu = (
  cafeteria: CafeteriaType,
  date: string,
  options?: MealScraperOptions,
) => {
  return createMealScraper(options).getParsedMenu(cafeteria, date);
};
