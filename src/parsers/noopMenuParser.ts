import { MenuParseException } from '../errors';
import { MenuParser } from '../interfaces';
import { ParsedMenuData, createParsedMenuData, RawMenuData } from '../domain';

const splitItems = (text: string): string[] =>
  text
    .split(/[\n\/,]/)
    .flatMap((line) => line.split('\u0026'))
    .flatMap((line) => line.split(' '))
    .map((s) => s.replace(/\*/g, '').trim())
    .filter(Boolean);

export class NoopMenuParser implements MenuParser {
  async parseMenu(raw: RawMenuData): Promise<ParsedMenuData> {
    try {
      const menus: Record<string, string[]> = {};
      for (const [slot, text] of Object.entries(raw.menuTexts)) {
        const items = splitItems(text).filter((item) => /[가-힣]/.test(item));
        menus[slot] = [...new Set(items)];
      }
      return createParsedMenuData(raw.date, raw.restaurant, menus);
    } catch (err) {
      throw new MenuParseException(raw.date, raw.restaurant, '기본 파싱 실패', err as string);
    }
  }
}
