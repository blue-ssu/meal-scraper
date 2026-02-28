import { RestaurantType } from '../../domain';
import { FoodCrawlerSettings } from '../../config';
import { SoongguriScraper } from './soongguriScraper';

export class FacultyScraper extends SoongguriScraper {
  constructor(settings: FoodCrawlerSettings) {
    super(settings, RestaurantType.FACULTY);
  }
}
