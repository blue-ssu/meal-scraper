import { MenuParser } from "../interfaces";
import { MenuParseException } from "../errors";
import {
  createDailyMenu,
  DailyMenu,
  normalizeMenuSlot,
  RawMenuData,
} from "../domain";

const SYSTEM_PROMPT = `당신은 한국 대학 식당 메뉴 데이터를 정확하게 파싱하는 전문가입니다.
- 메뉴명만 추출해서 아래 JSON 형식으로 반환:
  { "menus": ["메뉴명1", "메뉴명2"] }
- 메뉴명은 한글만 사용
- 불필요한 수식어 (예: "맛있는", "신선한")는 제거
- 중복된 메뉴명은 한 번만 작성
- 메뉴명이 없는 경우 menus는 빈 배열로 반환
- JSON 외 텍스트를 절대 포함하지 않음
- 메인 메뉴를 가장 앞에 배치
`;

export class GPTMenuParser implements MenuParser {
  private readonly client: any;
  private static readonly model = "gpt-5-nano";

  constructor(apiKey: string) {
    let openAIModule: {
      default?: new (args: { apiKey: string }) => any;
      OpenAI?: new (args: { apiKey: string }) => any;
    };

    try {
      openAIModule = require("openai");
    } catch {
      throw new Error(
        "openai 패키지가 설치되어 있지 않습니다. parser=\"gpt\" 사용 시 `pnpm add openai`가 필요합니다.",
      );
    }

    const OpenAIConstructor = openAIModule.default ?? openAIModule.OpenAI;
    if (!OpenAIConstructor) {
      throw new Error(
        "openai 모듈에서 OpenAI 클래스 초기화를 찾지 못했습니다.",
      );
    }

    this.client = new OpenAIConstructor({ apiKey });
  }

  private sanitizeMenuName(menu: string): string {
    return String(menu)
      .replace(/^[\s\-\*\u2022·•\d\.\)]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private normalizeTextForParsing(text: string): string {
    const tokens = text
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      return "";
    }

    const maxPhraseLength = 12;
    const normalized: string[] = [];

    for (let i = 0; i < tokens.length; ) {
      const remaining = tokens.length - i;
      const maxLen = Math.min(maxPhraseLength, Math.floor(remaining / 2));
      let matchedLen = 1;

      for (let len = maxLen; len >= 1; len--) {
        let isRepeated = true;
        for (let j = 0; j < len; j++) {
          if (tokens[i + j] !== tokens[i + len + j]) {
            isRepeated = false;
            break;
          }
        }

        if (isRepeated) {
          matchedLen = len;
          break;
        }
      }

      normalized.push(...tokens.slice(i, i + matchedLen));
      i += matchedLen * 2;
    }

    return normalized.join(" ");
  }

  private async parseMenuText(text: string): Promise<string[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const normalizedText = this.normalizeTextForParsing(text);
    if (!normalizedText) {
      return [];
    }

    const result = (await this.client.chat.completions.create({
      model: GPTMenuParser.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음 텍스트에서 메뉴명만 추출하세요.\n\n${normalizedText}`,
        },
      ],
      response_format: { type: "json_object" },
    })) as { choices?: { message?: { content?: string } }[] };

    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new Error("모델 응답이 비어 있습니다.");
    }

    const parsed = JSON.parse(content);
    const menus = parsed?.menus;
    if (!Array.isArray(menus)) {
      throw new Error("menus 배열이 없습니다.");
    }

    return menus
      .map((item: unknown) => this.sanitizeMenuName(String(item)))
      .filter((item) => item.length > 0);
  }

  async parseMenu(raw: RawMenuData): Promise<DailyMenu> {
    const menus: { breakfast: Record<string, string[]>; lunch: Record<string, string[]>; dinner: Record<string, string[]> } = {
      breakfast: {},
      lunch: {},
      dinner: {},
    };
    const errors: Record<string, string> = {};

    await Promise.all(
      Object.entries(raw.menuTexts).map(async ([slot, text]) => {
        try {
          const unique = new Set<string>();
          const parsed = await this.parseMenuText(text);
          const slotKey = normalizeMenuSlot(slot);
          if (!slotKey) return;

          parsed.forEach((menu) => unique.add(menu));
          menus[slotKey][slot] = Array.from(unique);
        } catch (err) {
          errors[slot] = String(err);
        }
      }),
    );

    if (Object.keys(errors).length > 0) {
      throw new MenuParseException(
        raw.date,
        raw.cafeteria,
        "일부 슬롯 파싱 실패",
        JSON.stringify(errors),
      );
    }

    return createDailyMenu(raw.date, raw.cafeteria, menus);
  }
}
