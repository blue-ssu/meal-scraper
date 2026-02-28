import { CafeteriaType } from './domain';

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

export const getRcd = (type: CafeteriaType, settings: FoodCrawlerSettings): number => {
  switch (type) {
    case CafeteriaType.HAKSIK:
      return settings.haksikRcd;
    case CafeteriaType.DODAM:
      return settings.dodamRcd;
    case CafeteriaType.FACULTY:
      return settings.facultyRcd;
    default:
      return 0;
  }
};
