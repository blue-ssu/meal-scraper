export type ErrorMetadata = Record<string, unknown>;

export class BaseCafeteriaException extends Error {
  public context: ErrorMetadata;

  constructor(
    public readonly targetDate: string,
    public readonly cafeteria: string,
    message: string,
    public readonly rawData?: unknown,
    context: ErrorMetadata = {},
  ) {
    const withContext =
      Object.keys(context).length > 0
        ? `${message} | context=${JSON.stringify(context)}`
        : message;
    super(`${cafeteria}(${targetDate}) ${withContext}`);
    this.name = this.constructor.name;
    this.context = context;
  }
}

export class HolidayException extends BaseCafeteriaException {}
export class MenuFetchException extends BaseCafeteriaException {}
export class MenuParseException extends BaseCafeteriaException {}
