export enum CafeteriaType {
  HAKSIK = "HAKSIK",
  DODAM = "DODAM",
  FACULTY = "FACULTY",
  DORMITORY = "DORMITORY",
}

export const CafeteriaMeta = {
  [CafeteriaType.HAKSIK]: {
    koreanName: "학생식당",
    englishName: "HAKSIK",
    soongguriRcd: 1,
  },
  [CafeteriaType.DODAM]: {
    koreanName: "도담식당",
    englishName: "DODAM",
    soongguriRcd: 2,
  },
  [CafeteriaType.FACULTY]: {
    koreanName: "교직원식당",
    englishName: "FACULTY",
    soongguriRcd: 7,
  },
  [CafeteriaType.DORMITORY]: {
    koreanName: "기숙사식당",
    englishName: "DORMITORY",
    soongguriRcd: null,
  },
} as const;

export const CafeteriaStatus = {
  Open: "open",
  Closed: "closed",
} as const;

export type CafeteriaStatus =
  (typeof CafeteriaStatus)[keyof typeof CafeteriaStatus];

export interface RawMenuData {
  date: string;
  cafeteria: CafeteriaType;
  menuTexts: Record<string, string>;
}

export type DailyMenuSlot = "breakfast" | "lunch" | "dinner";
export type MenuMap = Record<string, string[]>;

export interface DailyMenu {
  date: string;
  cafeteria: CafeteriaType;
  status: CafeteriaStatus;
  breakfast: MenuMap;
  lunch: MenuMap;
  dinner: MenuMap;
}

export const normalizeMenuSlot = (slot: string): DailyMenuSlot | undefined => {
  const normalized = String(slot ?? "")
    .replace(/\s+/g, "")
    .trim();

  if (
    normalized.includes("조식") ||
    normalized.includes("아침") ||
    normalized.includes("breakfast")
  ) {
    return "breakfast";
  }

  if (
    normalized.includes("중식") ||
    normalized.includes("점심") ||
    normalized.includes("lunch")
  ) {
    return "lunch";
  }

  if (
    normalized.includes("석식") ||
    normalized.includes("저녁") ||
    normalized.includes("dinner")
  ) {
    return "dinner";
  }

  return undefined;
};

export const createDailyMenu = (
  date: string,
  cafeteria: CafeteriaType,
  menus: {
    breakfast: MenuMap;
    lunch: MenuMap;
    dinner: MenuMap;
  },
  status: CafeteriaStatus = CafeteriaStatus.Open,
): DailyMenu => {
  return { date, cafeteria, status, ...menus };
};
