export class BaseCafeteriaException extends Error {
  constructor(
    public readonly targetDate: string,
    public readonly cafeteria: string,
    message: string,
    public readonly rawData?: unknown,
  ) {
    super(`${cafeteria}(${targetDate}) ${message}`);
  }
}

export class HolidayException extends BaseCafeteriaException {}
export class MenuFetchException extends BaseCafeteriaException {}
export class MenuParseException extends BaseCafeteriaException {}
