export enum RestaurantType {
  HAKSIK = "HAKSIK",
  DODAM = "DODAM",
  FACULTY = "FACULTY",
  DORMITORY = "DORMITORY",
}

export const RestaurantMeta = {
  [RestaurantType.HAKSIK]: { koreanName: "학생식당", englishName: "HAKSIK", soongguriRcd: 1 },
  [RestaurantType.DODAM]: { koreanName: "도담식당", englishName: "DODAM", soongguriRcd: 2 },
  [RestaurantType.FACULTY]: { koreanName: "교직원식당", englishName: "FACULTY", soongguriRcd: 7 },
  [RestaurantType.DORMITORY]: { koreanName: "기숙사식당", englishName: "DORMITORY", soongguriRcd: null },
} as const;

export enum TimeSlot {
  ONE_DOLLAR_MORNING = "MORNING",
  LUNCH = "LUNCH",
  DINNER = "DINNER",
}

export interface RawMenuData {
  date: string;
  restaurant: RestaurantType;
  menuTexts: Record<string, string>;
}

export interface ParsedMenuData {
  date: string;
  restaurant: RestaurantType;
  menus: Record<string, string[]>;
  successSlots: Record<string, string[]>;
  errorSlots: Record<string, string>;
}

export const createParsedMenuData = (
  date: string,
  restaurant: RestaurantType,
  menus: Record<string, string[]>,
  errorSlots: Record<string, string> = {},
): ParsedMenuData => {
  const successSlots: Record<string, string[]> = {};
  for (const [slot, items] of Object.entries(menus)) {
    if (!errorSlots[slot] && items.length > 0) {
      successSlots[slot] = items;
    }
  }
  return { date, restaurant, menus, successSlots, errorSlots };
};
