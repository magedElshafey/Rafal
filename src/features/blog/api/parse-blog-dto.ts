import type { BlogListDto, BlogPostResponseDto, BlogSummaryDto } from "@/features/blog/api/blog-dto";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export class BlogContractError extends Error {
  constructor(path: string, expected: string) {
    super('Invalid Blog payload at "' + path + '": expected ' + expected + '.');
    this.name = "BlogContractError";
  }
}
const { parseRecord, parseArray, parseString, parseNonEmptyString, parseBoolean } =
  createRuntimeValidators((path, expected) => new BlogContractError(path, expected));

function integer(value: unknown, path: string, minimum = 1): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new BlogContractError(path, minimum === 0 ? "a non-negative safe integer" : "a positive safe integer");
  }
  return value;
}
function cover(value: unknown, path: string): string | null {
  if (value === null) return null;
  const text = parseNonEmptyString(value, path);
  try {
    const url = new URL(text);
    if (url.protocol === "http:" || url.protocol === "https:") return text;
  } catch { /* Fall through to the contract error. */ }
  throw new BlogContractError(path, "an HTTP(S) URL or null");
}
function timestamp(value: unknown, path: string): string {
  const text = parseNonEmptyString(value, path);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(text);
  if (!match || !Number.isFinite(Date.parse(text))) {
    throw new BlogContractError(path, "a valid timestamp with timezone");
  }
  const [, year, month, day, hour, minute, second] = match;
  const leap = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 ||
      Number(day) > days[Number(month) - 1] || Number(hour) > 23 ||
      Number(minute) > 59 || Number(second) > 59) {
    throw new BlogContractError(path, "a valid calendar timestamp");
  }
  return text;
}
export function parseBlogSummaryDto(value: unknown, path = "post"): BlogSummaryDto {
  const source = parseRecord(value, path);
  const category = source.category === null ? null : parseRecord(source.category, path + ".category");
  return {
    id: integer(source.id, path + ".id"),
    slug: parseNonEmptyString(source.slug, path + ".slug").trim(),
    title: parseNonEmptyString(source.title, path + ".title"),
    excerpt: parseNonEmptyString(source.excerpt, path + ".excerpt"),
    cover_url: cover(source.cover_url, path + ".cover_url"),
    category: category === null ? null : {
      id: integer(category.id, path + ".category.id"),
      name: parseNonEmptyString(category.name, path + ".category.name"),
      slug: parseNonEmptyString(category.slug, path + ".category.slug").trim(),
    },
    author_name: source.author_name === null ? null : parseNonEmptyString(source.author_name, path + ".author_name"),
    is_featured: parseBoolean(source.is_featured, path + ".is_featured"),
    reading_time_minutes: integer(source.reading_time_minutes, path + ".reading_time_minutes", 0),
    published_at: timestamp(source.published_at, path + ".published_at"),
  };
}
export function parseBlogListDto(value: unknown): BlogListDto {
  const source = parseRecord(value, "response");
  const meta = parseRecord(source.meta, "response.meta");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: parseArray(source.data, "response.data").map((item, index) => parseBlogSummaryDto(item, "response.data[" + index + "]")),
    meta: {
      current_page: integer(meta.current_page, "response.meta.current_page"),
      last_page: integer(meta.last_page, "response.meta.last_page"),
      per_page: integer(meta.per_page, "response.meta.per_page"),
      total: integer(meta.total, "response.meta.total", 0),
    },
  };
}

export function parseBlogPostDto(value: unknown): BlogPostResponseDto {
  const source = parseRecord(value, "response");
  const data = parseRecord(source.data, "response.data");
  return {
    success: parseBoolean(source.success, "response.success"),
    message: parseString(source.message, "response.message"),
    data: {
      ...parseBlogSummaryDto(data, "response.data"),
      body: parseString(data.body, "response.data.body"),
      related: parseArray(data.related, "response.data.related").map((item, index) =>
        parseBlogSummaryDto(item, "response.data.related[" + index + "]"),
      ),
    },
  };
}
