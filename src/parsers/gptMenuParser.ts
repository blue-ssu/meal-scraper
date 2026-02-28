import { MenuParser } from '../interfaces';
import { MenuParseException } from '../errors';
import { createParsedMenuData, RawMenuData } from '../domain';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `당신은 한국 대학 식당 메뉴 데이터를 정확하게 파싱하는 전문가입니다. 메뉴명만 추출해서 JSON 배열로 반환하세요.`;

export class GPTMenuParser implements MenuParser {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async parseMenu(raw: RawMenuData) {
    const menus: Record<string, string[]> = {};
    const errors: Record<string, string> = {};

    for (const [slot, text] of Object.entries(raw.menuTexts)) {
      try {
        const chat = await this.client.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
          temperature: 0,
          tools: [
            {
              type: 'function',
              function: {
                name: 'extract_all_menus',
                description: '모든 메뉴명을 추출',
                parameters: {
                  type: 'object',
                  properties: {
                    all_menus: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['all_menus'],
                },
              },
            },
          ],
          tool_choice: {
            type: 'function',
            function: { name: 'extract_all_menus' },
          },
        });

        const call = chat.choices[0]?.message?.tool_calls?.[0];
        if (!call) {
          throw new Error('툴 응답 없음');
        }
        const args = JSON.parse(call.function.arguments);
        const arr = Array.isArray(args?.all_menus) ? args.all_menus : [];
        menus[slot] = arr.map((x: string) => String(x).replace(/\*/g, '').replace(/\s+/g, '')); 
      } catch (err) {
        errors[slot] = String(err);
        menus[slot] = [];
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new MenuParseException(raw.date, raw.restaurant, '일부 슬롯 파싱 실패', JSON.stringify(errors));
    }

    return createParsedMenuData(raw.date, raw.restaurant, menus);
  }
}
