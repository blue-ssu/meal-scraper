import { MenuParser, MenuScraper } from '../interfaces';
import { RawMenuData, ParsedMenuData, RestaurantType } from '../domain';
import { MenuFetchException, MenuParseException, BaseRestaurantException } from '../errors';
import { HaksikScraper } from '../repositories/scrapers/haksikScraper';
import { DodamScraper } from '../repositories/scrapers/dodamScraper';
import { FacultyScraper } from '../repositories/scrapers/facultyScraper';
import { DormitoryScraper } from '../repositories/scrapers/dormitoryScraper';
import { FoodCrawlerSettings, defaultSettings } from '../config';

export class FoodScrapingService {
  constructor(
    private readonly settings: FoodCrawlerSettings = defaultSettings,
    private readonly parser: MenuParser,
  ) {}

  private createScraper(restaurantType: RestaurantType): MenuScraper {
    if (restaurantType === RestaurantType.HAKSIK) {
      return new HaksikScraper(this.settings);
    }
    if (restaurantType === RestaurantType.DODAM) {
      return new DodamScraper(this.settings);
    }
    if (restaurantType === RestaurantType.FACULTY) {
      return new FacultyScraper(this.settings);
    }
    if (restaurantType === RestaurantType.DORMITORY) {
      return new DormitoryScraper(this.settings.dormitoryBaseUrl, this.settings.timeoutMs);
    }
    throw new Error(`Unsupported restaurant: ${restaurantType}`);
  }

  async scrapeRawMenu(restaurantType: RestaurantType, date: string): Promise<RawMenuData | RawMenuData[]> {
    try {
      const scraper = this.createScraper(restaurantType);
      return await scraper.scrapeMenu(date);
    } catch (err) {
      if (err instanceof BaseRestaurantException) throw err;
      throw new MenuFetchException(date, restaurantType, 'scrape 실패', err as unknown);
    }
  }

  async scrapeAndParseMenu(restaurantType: RestaurantType, date: string): Promise<ParsedMenuData | ParsedMenuData[]> {
    const raw = await this.scrapeRawMenu(restaurantType, date);

    if (Array.isArray(raw)) {
      const parsedList: ParsedMenuData[] = [];
      for (const item of raw) {
        parsedList.push(await this.parse(item));
      }
      return parsedList;
    }

    return this.parse(raw);
  }

  private async parse(raw: RawMenuData): Promise<ParsedMenuData> {
    try {
      return await this.parser.parseMenu(raw);
    } catch (err) {
      if (err instanceof BaseRestaurantException) throw err;
      throw new MenuParseException(raw.date, raw.restaurant, 'parse 실패', err as unknown);
    }
  }
}
