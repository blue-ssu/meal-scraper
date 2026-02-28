import { NoopMenuParser } from './parsers/noopMenuParser';
import { GPTMenuParser } from './parsers/gptMenuParser';
import { FoodScrapingService } from './services/scrapingService';
import { FoodCrawlerSettings, defaultSettings } from './config';
import { RawMenuData, ParsedMenuData, RestaurantType, TimeSlot } from './domain';

export { FoodScrapingService } from './services/scrapingService';
export { FoodCrawlerSettings, defaultSettings } from './config';
export { RestaurantType, RawMenuData, ParsedMenuData, TimeSlot } from './domain';
export { BaseRestaurantException, HolidayException, MenuFetchException, MenuParseException } from './errors';

export interface CreateLibraryOptions {
  settings?: Partial<FoodCrawlerSettings>;
  gptApiKey?: string;
}

export interface FoodCrawlerLibrary {
  scrapeRawMenu: (restaurant: RestaurantType, date: string) => Promise<RawMenuData | RawMenuData[]>;
  scrapeParsedMenu: (restaurant: RestaurantType, date: string) => Promise<ParsedMenuData | ParsedMenuData[]>;
}

export const createFoodCrawlerLibrary = (options: CreateLibraryOptions = {}): FoodCrawlerLibrary => {
  const settings: FoodCrawlerSettings = {
    ...defaultSettings,
    ...options.settings,
  };

  const parser = options.gptApiKey ? new GPTMenuParser(options.gptApiKey) : new NoopMenuParser();
  const service = new FoodScrapingService(settings, parser);

  return {
    scrapeRawMenu: (restaurant, date) => service.scrapeRawMenu(restaurant, date),
    scrapeParsedMenu: (restaurant, date) => service.scrapeAndParseMenu(restaurant, date),
  };
};

// 추가: 직접 함수 호출형 API
export const scrapeRawMenu = (restaurant: RestaurantType, date: string, options?: CreateLibraryOptions) => {
  return createFoodCrawlerLibrary(options).scrapeRawMenu(restaurant, date);
};

export const scrapeParsedMenu = (restaurant: RestaurantType, date: string, options?: CreateLibraryOptions) => {
  return createFoodCrawlerLibrary(options).scrapeParsedMenu(restaurant, date);
};
