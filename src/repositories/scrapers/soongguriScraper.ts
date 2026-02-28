import axios from "axios";
import { AxiosResponse } from "axios";
import { MenuScraper } from "../../interfaces";
import { CafeteriaType } from "../../domain";
import {
  BaseCafeteriaException,
  HolidayException,
  MenuFetchException,
} from "../../errors";
import { FoodCrawlerSettings, getRcd } from "../../config";
import { parseTableToDict, stripStringFromDict } from "../../utils/parsing";

export class SoongguriScraper implements MenuScraper {
  private readonly challengeRetryLimit = 2;
  private readonly cookieJar: Record<string, string> = {};

  constructor(
    private readonly settings: FoodCrawlerSettings,
    private readonly cafeteriaType: CafeteriaType,
  ) {}

  async scrapeMenu(date: string) {
    const normalizedDate = normalizeSgDate(date);
    const url = this.buildMenuUrl(normalizedDate);

    try {
      const html = await this.fetchWithRetry(url, 0, normalizedDate);
      const hasHoliday = html.includes("오늘은 쉽니다.") || html.includes("휴무");
      if (hasHoliday) {
        throw new HolidayException(
          date,
          this.cafeteriaType,
          "해당일은 휴무일입니다.",
          html,
          {
            endpoint: url,
            operation: "scrape",
            cafeteria: this.cafeteriaType,
            timeoutMs: this.settings.timeoutMs,
          },
        );
      }

      const parsed = parseTableToDict(html);
      const menus = stripStringFromDict(parsed);

      if (!Object.keys(menus).length) {
        throw new MenuFetchException(
          date,
          this.cafeteriaType,
          "메뉴를 찾지 못했습니다.",
          { menus, html },
          {
            endpoint: url,
            operation: "parse",
            cafeteria: this.cafeteriaType,
            timeoutMs: this.settings.timeoutMs,
          },
        );
      }

      return {
        date,
        cafeteria: this.cafeteriaType,
        menuTexts: menus,
      };
    } catch (err) {
      if (err instanceof HolidayException) {
        throw err;
      }
      if (err instanceof BaseCafeteriaException) {
        throw err;
      }

      const raw = err as {
        status?: number;
        response?: { status?: number; statusText?: string };
      };
      const statusCode = raw?.status ?? raw?.response?.status;
      const statusText = raw?.response?.statusText;
      throw new MenuFetchException(
        date,
        this.cafeteriaType,
        "메뉴 수집 실패",
        err as unknown,
        {
          endpoint: url,
          cafeteria: this.cafeteriaType,
          statusCode,
          statusText,
          timeoutMs: this.settings.timeoutMs,
        },
      );
    }
  }

  private async fetchWithRetry(
    url: string,
    attempt = 0,
    targetDate: string,
  ): Promise<string> {
    const response = await axios.get(url, {
      timeout: this.settings.timeoutMs,
      responseType: "text",
      validateStatus: (s) => s >= 200 && s < 300,
      headers: this.buildBrowserLikeHeaders(attempt),
    });

    this.applySetCookies(response.headers);

    const html = String(response.data);
    if (this.isChallengeResponse(html) && attempt < this.challengeRetryLimit) {
      const nextAttempt = attempt + 1;
      return this.fetchWithRetry(
        this.buildMenuUrl(url, nextAttempt),
        nextAttempt,
        targetDate,
      );
    }

    if (this.isChallengeResponse(html) && attempt >= this.challengeRetryLimit) {
      throw new MenuFetchException(
        targetDate,
        this.cafeteriaType,
        "자동등록방지 우회 실패",
        html,
        {
          endpoint: url,
          operation: "scrape",
          cafeteria: this.cafeteriaType,
          challengeBypass: true,
          attempts: attempt,
          ckattempt: nextChallengeAttempt(attempt),
        },
      );
    }

    return html;
  }

  private buildMenuUrl(url: string, ckattempt?: number): string {
    const parsed = new URL(url);
    const nextUrl = new URL(`${parsed.origin}${parsed.pathname}`);
    const params = new URLSearchParams(parsed.search);
    const rcd = params.get("rcd") ?? String(getRcd(this.cafeteriaType, this.settings));
    const sdt = params.get("sdt") ?? "";

    nextUrl.searchParams.set("rcd", rcd);
    nextUrl.searchParams.set("sdt", sdt);
    if (typeof ckattempt === "number") {
      nextUrl.searchParams.set("ckattempt", String(ckattempt));
    }

    return nextUrl.toString();
  }

  private buildBrowserLikeHeaders(attempt: number): Record<string, string> {
    const headers: Record<string, string> = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.7,en;q=0.6",
      "cache-control": "no-cache",
      pragma: "no-cache",
      referer: this.settings.soongguriBaseUrl,
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
    };

    if (attempt > 0) {
      headers["upgrade-insecure-requests"] = "1";
    }

    const cookie = this.getCookieHeader();
    if (cookie) {
      headers.cookie = cookie;
    }

    return headers;
  }

  private getCookieHeader(): string {
    return Object.entries(this.cookieJar)
      .filter(([, value]) => value.length > 0)
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  private applySetCookies(headers: AxiosResponse["headers"]): void {
    const setCookie = headers["set-cookie"];
    if (!setCookie) {
      return;
    }

    const rawCookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const raw of rawCookies) {
      const tuple = raw.split(";")[0];
      const separatorIdx = tuple.indexOf("=");
      if (separatorIdx < 1) {
        continue;
      }

      const name = tuple.slice(0, separatorIdx).trim();
      const value = tuple.slice(separatorIdx + 1).trim();
      if (!name) {
        continue;
      }

      this.cookieJar[name] = value;
    }
  }

  private isChallengeResponse(html: string): boolean {
    return (
      html.includes("자동등록방지를 위해 보안절차를 거치고 있습니다.") ||
      html.includes("/___verify") ||
      html.includes("Please prove that you are human.")
    );
  }
}

const normalizeSgDate = (date: string): string => {
  const digits = date.replace(/\D/g, "").slice(0, 8);
  return digits.length === 8 ? digits : date;
};

const nextChallengeAttempt = (attempt: number): number => {
  return attempt + 1;
};
