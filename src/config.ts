import { RestaurantType } from './domain';

export interface FoodCrawlerSettings {
  soongguriBaseUrl: string;
  dormitoryBaseUrl: string;
  haksikRcd: number;
  dodamRcd: number;
  facultyRcd: number;
  timeoutMs: number;
}

export const defaultSettings: FoodCrawlerSettings = {
  soongguriBaseUrl: "http://m.soongguri.com/m_req/m_menu.php",
  dormitoryBaseUrl: "https://ssudorm.ssu.ac.kr:444/SShostel/mall_main.php",
  haksikRcd: 1,
  dodamRcd: 2,
  facultyRcd: 7,
  timeoutMs: 15000,
};

export const getRcd = (type: RestaurantType, settings: FoodCrawlerSettings): number => {
  switch (type) {
    case RestaurantType.HAKSIK:
      return settings.haksikRcd;
    case RestaurantType.DODAM:
      return settings.dodamRcd;
    case RestaurantType.FACULTY:
      return settings.facultyRcd;
    default:
      return 0;
  }
};
