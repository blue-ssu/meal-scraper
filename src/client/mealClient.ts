import { MenuParser } from "../interfaces";
import { NoopMenuParser } from "../parsers/noopMenuParser";
import { GPTMenuParser } from "../parsers/gptMenuParser";
import { FoodScrapingService } from "../services/scrapingService";
import { FoodCrawlerSettings, defaultSettings } from "../config";
import { RawMenuData, DailyMenu, CafeteriaType } from "../domain";
import { MenuDateInput, MealClientOptions, RangeOptions } from "./types";
import { buildDateRange, normalizeMenuDate } from "./dateUtils";
import { runWithConcurrency } from "./concurrency";

const DEFAULT_CONCURRENCY = 3;

export class MealClient {
  private readonly service: FoodScrapingService;

  constructor(options: MealClientOptions = {}) {
    const settings: FoodCrawlerSettings = {
      ...defaultSettings,
      ...(options.settings ?? {}),
    };

    let parser: MenuParser;
    const parserMode = options.parser ?? "noop";

    if (parserMode === "gpt") {
      if (!options.gptApiKey) {
        throw new Error("gpt parser requires gptApiKey");
      }
      parser = new GPTMenuParser(options.gptApiKey);
    } else if (parserMode === "custom") {
      if (!options.parserImpl) {
        throw new Error("custom parser requires parserImpl");
      }
      parser = options.parserImpl;
    } else {
      parser = new NoopMenuParser();
    }

    this.service = new FoodScrapingService(settings, parser);
  }

  getRawMenu(
    cafeteria: CafeteriaType,
    date: MenuDateInput,
  ): Promise<RawMenuData> {
    return this.service.scrapeRawMenu(cafeteria, normalizeMenuDate(date));
  }

  getDailyMenu(
    cafeteria: CafeteriaType,
    date: MenuDateInput,
  ): Promise<DailyMenu> {
    return this.service.scrapeAndParseMenu(cafeteria, normalizeMenuDate(date));
  }

  async getRawMenus(
    cafeteria: CafeteriaType,
    dates: MenuDateInput[],
    options: RangeOptions = {},
  ): Promise<RawMenuData[]> {
    const normalizedDates = dates.map(normalizeMenuDate);
    const concurrencyLimit = options.concurrency ?? DEFAULT_CONCURRENCY;

    const tasks = normalizedDates.map(
      (date) => () => this.service.scrapeRawMenu(cafeteria, date),
    );
    return runWithConcurrency(tasks, concurrencyLimit);
  }

  async getDailyMenus(
    cafeteria: CafeteriaType,
    dates: MenuDateInput[],
    options: RangeOptions = {},
  ): Promise<DailyMenu[]> {
    const normalizedDates = dates.map(normalizeMenuDate);
    const concurrencyLimit = options.concurrency ?? DEFAULT_CONCURRENCY;

    const tasks = normalizedDates.map(
      (date) => () => this.service.scrapeAndParseMenu(cafeteria, date),
    );
    return runWithConcurrency(tasks, concurrencyLimit);
  }

  async getRawMenusByRange(
    cafeteria: CafeteriaType,
    start: MenuDateInput,
    end: MenuDateInput,
    options: RangeOptions = {},
  ): Promise<RawMenuData[]> {
    const range = buildDateRange(
      normalizeMenuDate(start),
      normalizeMenuDate(end),
    );
    const startOffset = options.startInclusive === false ? 1 : 0;
    const targetDates = range.slice(startOffset);
    return this.getRawMenus(cafeteria, targetDates, options);
  }

  async getDailyMenusByRange(
    cafeteria: CafeteriaType,
    start: MenuDateInput,
    end: MenuDateInput,
    options: RangeOptions = {},
  ): Promise<DailyMenu[]> {
    const range = buildDateRange(
      normalizeMenuDate(start),
      normalizeMenuDate(end),
    );
    const startOffset = options.startInclusive === false ? 1 : 0;
    const targetDates = range.slice(startOffset);
    return this.getDailyMenus(cafeteria, targetDates, options);
  }
}

export const createMealClient = (options?: MealClientOptions): MealClient => {
  return new MealClient(options);
};
