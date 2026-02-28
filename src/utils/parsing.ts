import * as cheerio from "cheerio";

export const normalizeText = (v: string): string =>
  v.replace(/\r/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

export const parseTableToDict = (html: string): Record<string, string> => {
  const $ = cheerio.load(html);
  const result: Record<string, string> = {};

  $("tr").each((_, tr) => {
    const menuSlot = $(tr).find("td.menu_nm").first().text().trim();
    if (!menuSlot) return;
    const rowText = $(tr)
      .find("*")
      .contents()
      .toArray()
      .map((node) => $(node).text())
      .join(" ");
    const cleaned = normalizeText(rowText);
    result[menuSlot] = cleaned;
  });

  return result;
};

export const stripStringFromDict = (
  menuDict: Record<string, string>,
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(menuDict)) {
    out[key] = normalizeText(value);
  }
  return out;
};

export const make2d = (tableHtml: string | null): string[][] => {
  if (!tableHtml) return [];
  const $ = cheerio.load(tableHtml);
  const rows = $("tr");

  const matrix: string[][] = [];

  rows.each((rIdx, tr) => {
    const rowCells = $(tr)
      .find("th,td")
      .filter((_, el) => el.parent === tr);

    if (!matrix[rIdx]) matrix[rIdx] = [];

    let cIdx = 0;
    rowCells.each((_, cell) => {
      while (matrix[rIdx][cIdx] !== undefined) cIdx += 1;

      const attrs = (cell as any).attribs || {};
      const txt = normalizeText($(cell).text());
      const colspan = Math.max(1, Number.parseInt(attrs.colspan || "1", 10));
      const rowspan = Math.max(1, Number.parseInt(attrs.rowspan || "1", 10));

      for (let cc = 0; cc < colspan; cc++) {
        matrix[rIdx][cIdx + cc] = txt;
      }

      for (let rr = 1; rr < rowspan; rr++) {
        const targetRow = rIdx + rr;
        if (!matrix[targetRow]) matrix[targetRow] = [];
        for (let cc = 0; cc < colspan; cc++) {
          matrix[targetRow][cIdx + cc] = txt;
        }
      }

      cIdx += colspan;
    });
  });

  return matrix.map((row) => row.map((v) => normalizeText(v ?? "")));
};

export const make2dFromHtml = (html: string): string[][] => {
  const $ = cheerio.load(html);
  const table = $("table.boxstyle02").first();
  if (!table.length) return [];
  const rows = table.find("tr").toArray();
  const rowHtml = rows.map((r) => $.html(r) ?? "").join("");
  return make2d(rowHtml);
};
