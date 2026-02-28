# @bluessu/meal-scraper

[![npm version](https://img.shields.io/npm/v/@bluessu/meal-scraper.svg)](https://www.npmjs.com/package/@bluessu/meal-scraper)
[![npm downloads](https://img.shields.io/npm/dm/@bluessu/meal-scraper.svg)](https://www.npmjs.com/package/@bluessu/meal-scraper)
[![license](https://img.shields.io/npm/l/@bluessu/meal-scraper.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## 설치

Using npm:

```bash
npm i @bluessu/meal-scraper
```

Using yarn

```bash
yarn add @bluessu/meal-scraper
```

Using pnpm:

```bash
pnpm add @bluessu/meal-scraper
```

## 특징

- `createMealClient()` 또는 `new MealClient()`로 클라이언트 생성
- 단건 조회/배치 조회/범위 조회 지원
- 날짜 입력을 `string` 또는 `Date`로 유연하게 지원
- 내부 구현 분리로 공개 API가 간결하고 유지보수하기 쉬운 구조

## 공개 API

`src/index.ts`에서 노출되는 주요 API는 다음과 같습니다.

- `MealClient`
- `createMealClient`
- `normalizeMenuDate`
- `buildDateRange`
- 타입
  - `MenuDateInput`
  - `MenuDate`
  - `ParserMode`
  - `MealClientOptions`
  - `RangeOptions`
- 도메인/설정
  - `CafeteriaType`
  - `RawMenuData`
  - `DailyMenu`
  - `FoodCrawlerSettings`
  - `defaultSettings`
- 예외
  - `BaseCafeteriaException`
  - `HolidayException`
  - `MenuFetchException`
  - `MenuParseException`

## 기본 사용법

```ts
import {
  MealClient,
  createMealClient,
  CafeteriaType,
  normalizeMenuDate,
  buildDateRange,
} from "@bluessu/meal-scraper";

const client = createMealClient();
await client.getRawMenu(CafeteriaType.DODAM, new Date());
await client.getDailyMenu(CafeteriaType.HAKSIK, "2026-02-28");
await client.getDailyMenusByRange(CafeteriaType.FACULTY, "2026-02-28", "2026-03-02", {
  concurrency: 3,
});
```

## Client 옵션

```ts
export type ParserMode = "noop" | "gpt" | "custom";
```

- `noop`(기본): 기본 파서(`NoopMenuParser`) 사용
- `gpt`: OpenAI 파서 사용 (`gptApiKey` 필수)
- `custom`: 직접 구현한 파서를 `parserImpl`로 주입

```ts
import { createMealClient } from "@bluessu/meal-scraper";

// GPT 모드 예시 (키가 없으면 생성 단계에서 에러)
const gptClient = createMealClient({
  parser: "gpt",
  gptApiKey: process.env.OPENAI_API_KEY,
});

// 커스텀 파서 주입 예시
const customClient = createMealClient({
  parser: "custom",
  parserImpl: {
    parseMenu: async (raw) => {
      // 사용자 구현
      return {
        date: raw.date,
        cafeteria: raw.cafeteria,
        status: "open",
        breakfast: {},
        lunch: {},
        dinner: {},
      };
    },
  },
});
```

## 날짜 정규화 유틸

```ts
import { normalizeMenuDate, buildDateRange } from "@bluessu/meal-scraper";

normalizeMenuDate("2026-02-28"); // "2026-02-28"
normalizeMenuDate(new Date(2026, 1, 28)); // "2026-02-28"

buildDateRange("2026-02-28", "2026-03-02"); // ["2026-02-28","2026-03-01","2026-03-02"]
```

지원 날짜 포맷은 내부적으로 모두 `YYYY-MM-DD`로 정규화됩니다.

## API 목록

### `MealClient`

- `getRawMenu(cafeteria, date): Promise<RawMenuData>`
- `getDailyMenu(cafeteria, date): Promise<DailyMenu>`
- `getRawMenus(cafeteria, dates, options?): Promise<RawMenuData[]>`
- `getDailyMenus(cafeteria, dates, options?): Promise<DailyMenu[]>`
- `getRawMenusByRange(cafeteria, start, end, options?): Promise<RawMenuData[]>`
- `getDailyMenusByRange(cafeteria, start, end, options?): Promise<DailyMenu[]>`

### 옵션

- `RangeOptions`
  - `startInclusive?: boolean` (기본값: `true`)
  - `concurrency?: number` (기본값: `3`)

## 에러 처리

```ts
import { HolidayException, MenuFetchException } from "@bluessu/meal-scraper";

try {
  const menu = await client.getDailyMenu(CafeteriaType.DORMITORY, "2026-02-28");
} catch (error) {
  if (error instanceof HolidayException) {
    console.log("휴일입니다");
  } else if (error instanceof MenuFetchException) {
    console.log("수집 실패");
  } else {
    console.error(error);
  }
}
```

## 프로젝트 구조

현재 공개 엔트리는 `src/index.ts`에 집중하고, 실제 구현은 내부 레이어로 분리되어 있습니다.

- `src/index.ts`: 라이브러리 바렐(export hub)
- `src/client/*`: 클라이언트 API 및 유틸
- `src/services/*`: 수집/파싱 오케스트레이션
- `src/repositories/*`: 사이트별 스크래퍼
- `src/parsers/*`: 파싱 전략
- `src/domain.ts`, `src/config.ts`, `src/errors.ts`: 도메인/설정/예외

## 라이선스

GNU General Public License Version 3 (GPL-3.0) 입니다.  
라이선스 파일은 `LICENSE`를 확인하세요.
