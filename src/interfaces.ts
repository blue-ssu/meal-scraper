import { DailyMenu, RawMenuData, CafeteriaType } from "./domain";

export interface MenuScraper {
  scrapeMenu(date: string): Promise<RawMenuData>;
}

export interface MenuParser {
  parseMenu(raw: RawMenuData): Promise<DailyMenu>;
}

export interface CrawlerOptions {
  cafeteria: CafeteriaType;
  date: string;
}
