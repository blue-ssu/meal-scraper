import { CafeteriaType } from '../../domain';
import { FoodCrawlerSettings } from '../../config';
import { SoongguriScraper } from './soongguriScraper';

export class HaksikScraper extends SoongguriScraper {
  constructor(settings: FoodCrawlerSettings) {
    super(settings, CafeteriaType.HAKSIK);
  }
}
