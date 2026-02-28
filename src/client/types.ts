import { FoodCrawlerSettings } from "../config";
import { MenuParser } from "../interfaces";

export type MenuDateInput = string | Date;
export type MenuDate = string;
export type ParserMode = "noop" | "gpt" | "custom";

export interface MealClientOptions {
  settings?: Partial<FoodCrawlerSettings>;
  parser?: ParserMode;
  gptApiKey?: string;
  parserImpl?: MenuParser;
}

export interface RangeOptions {
  startInclusive?: boolean;
  concurrency?: number;
}
