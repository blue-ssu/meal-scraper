import { MenuParseException } from '../errors';
import { MenuParser } from '../interfaces';
import {
  createDailyMenu,
  DailyMenu,
  normalizeMenuSlot,
  RawMenuData,
} from '../domain';

const splitItems = (text: string): string[] =>
  text
    .split(/[\n\/,]/)
    .flatMap((line) => line.split('\u0026'))
    .flatMap((line) => line.split(' '))
    .map((s) => s.replace(/\*/g, '').trim())
    .filter(Boolean);

export class NoopMenuParser implements MenuParser {
  async parseMenu(raw: RawMenuData): Promise<DailyMenu> {
    try {
      const dailyMenu: DailyMenu = createDailyMenu(raw.date, raw.cafeteria, {
        breakfast: {},
        lunch: {},
        dinner: {},
      });
      for (const [slot, text] of Object.entries(raw.menuTexts)) {
        const items = splitItems(text).filter((item) => /[가-힣]/.test(item));
        const slotKey = normalizeMenuSlot(slot);
        if (!slotKey) continue;
        dailyMenu[slotKey] = {
          ...dailyMenu[slotKey],
          [slot]: [...new Set(items)],
        };
      }

      return dailyMenu;
    } catch (err) {
      throw new MenuParseException(
        raw.date,
        raw.cafeteria,
        '기본 파싱 실패',
        err as string,
      );
    }
  }
}
