import axios from "axios";
import { MenuScraper } from "../../interfaces";
import { CafeteriaType, RawMenuData } from "../../domain";
import { HolidayException, MenuFetchException } from "../../errors";
import { make2dFromHtml } from "../../utils/parsing";

export class DormitoryScraper implements MenuScraper {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number = 15000,
  ) {}

  async scrapeMenu(date: string): Promise<RawMenuData> {
    const dt = parseDate(date);
    const targetDate = formatDateKey(dt);

    const res = await axios.get<ArrayBuffer>(this.baseUrl, {
      params: {
        viewform: "B0001_foodboard_list",
        gyear: dt.getFullYear(),
        gmonth: dt.getMonth() + 1,
        gday: dt.getDate(),
      },
      timeout: this.timeoutMs,
      responseType: "arraybuffer",
      validateStatus: (s) => s >= 200 && s < 300,
    });

    try {
      const bytes = new Uint8Array(res.data);
      const encoding = detectEncoding({
        data: res.data,
        headers: res.headers as Record<string, string | undefined>,
      });
      const html = new TextDecoder(encoding).decode(bytes);
      const matrix = make2dFromHtml(html);
      const parsedRows = structureRows(matrix);

      let matched: RawMenuData | undefined;

      for (const row of parsedRows) {
        const dateStr = parseDateTokenKey(row["날짜"]);
        if (!dateStr) continue;

        const menuTexts = extractMenuTexts(row);
        if (Object.keys(menuTexts).length === 0) continue;

        if (dateStr !== targetDate) continue;

        matched = {
          date: dateStr,
          cafeteria: CafeteriaType.DORMITORY,
          menuTexts,
        };
        break;
      }

      if (!matched) {
        throw new MenuFetchException(
          date,
          CafeteriaType.DORMITORY,
          "요청한 날짜의 메뉴가 없습니다",
        );
      }

      return matched;
    } catch (err) {
      if (err instanceof HolidayException) {
        throw err;
      }

      throw new MenuFetchException(
        date,
        CafeteriaType.DORMITORY,
        "기숙사 메뉴 파싱 실패",
        err as unknown,
      );
    }
  }
}

const detectEncoding = (res: {
  data: ArrayBuffer;
  headers: Record<string, string | undefined>;
}): string => {
  const header = String(res.headers["content-type"] ?? "").toLowerCase();
  const headerCharset = header.match(/charset=([a-z0-9-]+)/i)?.[1];
  if (headerCharset) {
    const lower = headerCharset.toLowerCase();
    if (lower.includes("utf-8") || lower.includes("utf8")) return "utf-8";
    if (lower.includes("euc-kr") || lower.includes("cp949")) return "euc-kr";
  }

  const latin1Text = new TextDecoder("latin1").decode(new Uint8Array(res.data));
  const metaCharset = latin1Text.match(
    /<meta[^>]*charset\s*=\s*([a-z0-9-]+)/i,
  )?.[1];
  if (metaCharset) {
    const lower = metaCharset.toLowerCase();
    if (lower.includes("utf-8") || lower.includes("utf8")) return "utf-8";
    if (lower.includes("euc-kr") || lower.includes("cp949")) return "euc-kr";
  }

  return "euc-kr";
};

const parseDate = (date: string): Date => {
  if (/^\d{8}$/.test(date)) {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(4, 6));
    const day = Number(date.slice(6, 8));
    return new Date(year, month - 1, day);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-");
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );
  }

  return new Date(date);
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateTokenKey = (value: string | undefined): string => {
  if (!value) return "";
  const trimmed = value.split(/\s+/)[0];
  const withDash = trimmed.replace(/[.]/g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(withDash)) {
    return withDash;
  }
  const compact = withDash.replace(/-/g, "");
  if (/^\d{8}$/.test(compact)) {
    const year = Number(compact.slice(0, 4));
    const month = Number(compact.slice(4, 6));
    const day = Number(compact.slice(6, 8));
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return "";
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  if (/^\d{4}$/.test(compact)) {
    const year = new Date().getFullYear();
    const month = Number(compact.slice(0, 2));
    const day = Number(compact.slice(2, 4));
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return "";
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  if (/^\d{2}-\d{2}$/.test(withDash)) {
    const [monthPart, dayPart] = withDash.split("-");
    const year = new Date().getFullYear();
    const month = Number(monthPart);
    const day = Number(dayPart);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return "";
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return "";
};

type RowDict = Record<string, string>;

const structureRows = (matrix: string[][]): RowDict[] => {
  if (!matrix.length) return [];
  const headers = matrix[0];
  const dateCol = headers.findIndex((h) => h === "날짜");
  if (dateCol < 0) return [];

  const colMap = new Map<number, string>();
  for (let i = 0; i < headers.length; i++) {
    if (
      headers[i] === "조식" ||
      headers[i] === "중식" ||
      headers[i] === "석식"
    ) {
      colMap.set(i, headers[i]);
    }
  }

  const out: RowDict[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || !row[dateCol]) continue;

    const dict: RowDict = { 날짜: row[dateCol] || "" };
    for (const [idx, key] of colMap) {
      dict[key] = row[idx] || "";
    }
    out.push(dict);
  }
  return out;
};

const extractMenuTexts = (row: RowDict): Record<string, string> => {
  const out: Record<string, string> = {};
  ["중식", "석식"].forEach((slot) => {
    const value = row[slot];
    if (!value) return;
    const items = value
      .split("\r\n")
      .map((x) => x.trim())
      .filter((x) => x.length > 0 && !x.includes("운영"));

    if (items.length > 0) {
      out[slot] = items.join(" ");
    }
  });
  return out;
};
