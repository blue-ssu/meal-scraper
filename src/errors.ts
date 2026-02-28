export class BaseRestaurantException extends Error {
  constructor(
    public readonly targetDate: string,
    public readonly restaurant: string,
    message: string,
    public readonly rawData?: unknown,
  ) {
    super(`${restaurant}(${targetDate}) ${message}`);
  }
}

export class HolidayException extends BaseRestaurantException {}
export class MenuFetchException extends BaseRestaurantException {}
export class MenuParseException extends BaseRestaurantException {}
