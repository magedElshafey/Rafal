import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export type StaticPageDto = {
  success: boolean;
  message: string;
  data: { id: number; slug: string; title: string; content: string };
};

export class StaticPageContractError extends Error {
  constructor(path: string, expected: string) {
    super('Invalid Static Page payload at "' + path + '": expected ' + expected + '.');
    this.name = "StaticPageContractError";
  }
}

const { parseRecord, parseString, parseNonEmptyString, parseBoolean } =
  createRuntimeValidators((path, expected) => new StaticPageContractError(path, expected));

export function parseStaticPageDto(value: unknown, expectedSlug: string): StaticPageDto {
  const source = parseRecord(value, "response");
  const data = parseRecord(source.data, "response.data");
  const id = data.id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new StaticPageContractError("response.data.id", "a positive safe integer");
  }
  const slug = parseNonEmptyString(data.slug, "response.data.slug");
  if (slug !== expectedSlug) {
    throw new StaticPageContractError("response.data.slug", "the requested page slug");
  }
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: {
      id, slug,
      title: parseNonEmptyString(data.title, "response.data.title"),
      content: parseString(data.content, "response.data.content"),
    },
  };
}
