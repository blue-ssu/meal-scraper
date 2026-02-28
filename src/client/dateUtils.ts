import { MenuDate, MenuDateInput } from "./types";

const MENU_DATE_COMPACT_RE = /^\d{8}$/;
const MENU_DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const toDate = (value: string): Date => {
  if (MENU_DATE_COMPACT_RE.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    const date = new Date(year, month - 1, day);
    const isValidDate =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;
    if (!isValidDate) {
      throw new RangeError(`invalid menu date: ${value}`);
    }
    return date;
  }

  if (MENU_DATE_ISO_RE.test(value)) {
    const [y, m, d] = value.split("-");
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    const date = new Date(year, month - 1, day);
    const isValidDate =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;
    if (!isValidDate) {
      throw new RangeError(`invalid menu date: ${value}`);
    }
    return date;
  }

  throw new RangeError(`invalid menu date: ${value}`);
};

export const normalizeMenuDate = (input: MenuDateInput): MenuDate => {
  let date: Date;

  if (input instanceof Date) {
    date = input;
  } else if (typeof input === "string") {
    if (MENU_DATE_COMPACT_RE.test(input) || MENU_DATE_ISO_RE.test(input)) {
      date = toDate(input);
    } else {
      date = new Date(input);
    }
  } else {
    throw new TypeError("menu date must be a Date or string");
  }

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`invalid menu date: ${String(input)}`);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const buildDateRange = (start: MenuDate, end: MenuDate): MenuDate[] => {
  const parse = (value: MenuDate): Date => {
    if (!MENU_DATE_COMPACT_RE.test(value) && !MENU_DATE_ISO_RE.test(value)) {
      throw new RangeError(`invalid menu date: ${value}`);
    }
    return toDate(value);
  };

  const startDate = parse(start);
  const endDate = parse(end);

  if (startDate > endDate) {
    throw new RangeError(`start date must not be after end date: ${start} ~ ${end}`);
  }

  const out: MenuDate[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    out.push(normalizeMenuDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
};
