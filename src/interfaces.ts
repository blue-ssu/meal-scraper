import { RawMenuData, ParsedMenuData, RestaurantType } from './domain';

export interface MenuScraper {
  scrapeMenu(date: string): Promise<RawMenuData>;
}

export interface MenuParser {
  parseMenu(raw: RawMenuData): Promise<ParsedMenuData>;
}

export interface CrawlerOptions {
  restaurant: RestaurantType;
  date: string;
}
