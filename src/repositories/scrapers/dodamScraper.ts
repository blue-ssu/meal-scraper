import { CafeteriaType } from '../../domain';
import { FoodCrawlerSettings } from '../../config';
import { SoongguriScraper } from './soongguriScraper';

export class DodamScraper extends SoongguriScraper {
  constructor(settings: FoodCrawlerSettings) {
    super(settings, CafeteriaType.DODAM);
  }
}
