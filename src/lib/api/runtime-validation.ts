export type ContractErrorFactory = (path: string, expected: string) => Error;

export function createRuntimeValidators(createError: ContractErrorFactory) {
  function fail(path: string, expected: string): never {
    throw createError(path, expected);
  }

  function parseRecord(value: unknown, path: string): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      fail(path, "an object");
    }

    return value as Record<string, unknown>;
  }

  function parseArray(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) {
      fail(path, "an array");
    }

    return value;
  }

  function parseString(value: unknown, path: string): string {
    if (typeof value !== "string") {
      fail(path, "a string");
    }

    return value;
  }

  function parseNullableString(value: unknown, path: string): string | null {
    return value === null ? null : parseString(value, path);
  }

  function parseNonEmptyString(value: unknown, path: string): string {
    const parsed = parseString(value, path);

    if (parsed.trim() === "") {
      fail(path, "a non-empty string");
    }

    return parsed;
  }

  function parseBoolean(value: unknown, path: string): boolean {
    if (typeof value !== "boolean") {
      fail(path, "a boolean");
    }

    return value;
  }

  function parseFiniteNumber(value: unknown, path: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      fail(path, "a finite number");
    }

    return value;
  }

  function parseNullableNumber(value: unknown, path: string): number | null {
    return value === null ? null : parseFiniteNumber(value, path);
  }

  return {
    parseArray,
    parseBoolean,
    parseFiniteNumber,
    parseNonEmptyString,
    parseNullableNumber,
    parseNullableString,
    parseRecord,
    parseString,
  };
}
