import axios from 'axios';
import { MenuScraper } from '../../interfaces';
import { RestaurantType, RawMenuData } from '../../domain';
import { MenuFetchException } from '../../errors';
import { make2dFromHtml } from '../../utils/parsing';

export class DormitoryScraper implements MenuScraper {
  constructor(private readonly baseUrl: string, private readonly timeoutMs: number = 15000) {}

  async scrapeMenu(date: string): Promise<RawMenuData[]> {
    const dt = parseDate(date);

    const res = await axios.get(this.baseUrl, {
      params: {
        viewform: 'B0001_foodboard_list',
        gyear: dt.getFullYear(),
        gmonth: dt.getMonth() + 1,
        gday: dt.getDate(),
      },
      timeout: this.timeoutMs,
      responseType: 'text',
      validateStatus: (s) => s >= 200 && s < 300,
    });

    try {
      const matrix = make2dFromHtml(String(res.data));
      const parsedRows = structureRows(matrix);
      const result: RawMenuData[] = [];

      for (const row of parsedRows) {
        const dateStr = parseDateToken(row['날짜']);
        if (!dateStr) continue;

        const menuTexts = extractMenuTexts(row);
        if (Object.keys(menuTexts).length === 0) continue;

        result.push({
          date: dateStr,
          restaurant: RestaurantType.DORMITORY,
          menuTexts,
        });
      }

      return result.slice(0, 7);
    } catch (err) {
      throw new MenuFetchException(date, RestaurantType.DORMITORY, '기숙사 메뉴 파싱 실패', err as unknown);
    }
  }
}

const parseDate = (date: string): Date => {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(4, 6));
  const d = Number(date.slice(6, 8));
  return new Date(y, m - 1, d);
};

const parseDateToken = (value: string | undefined): string => {
  if (!value) return '';
  const clean = value.split(/\s+/)[0].replace(/-/g, '');
  if (clean.length === 8) return clean;
  if (clean.length === 4) {
    const year = new Date().getFullYear();
    return `${year}${clean}`;
  }
  return '';
};

type RowDict = Record<string, string>;

const structureRows = (matrix: string[][]): RowDict[] => {
  if (!matrix.length) return [];
  const headers = matrix[0];
  const dateCol = headers.findIndex((h) => h === '날짜');
  if (dateCol < 0) return [];

  const colMap = new Map<number, string>();
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === '조식' || headers[i] === '중식' || headers[i] === '석식') {
      colMap.set(i, headers[i]);
    }
  }

  const out: RowDict[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || !row[dateCol]) continue;

    const dict: RowDict = { 날짜: row[dateCol] || '' };
    for (const [idx, key] of colMap) {
      dict[key] = row[idx] || '';
    }
    out.push(dict);
  }
  return out;
};

const extractMenuTexts = (row: RowDict): Record<string, string> => {
  const out: Record<string, string> = {};
  ['중식', '석식'].forEach((slot) => {
    const value = row[slot];
    if (!value) return;
    const items = value
      .split('\r\n')
      .map((x) => x.trim())
      .filter((x) => x.length > 0 && !x.includes('운영'));

    if (items.length > 0) {
      out[slot] = items.join(' ');
    }
  });
  return out;
};
