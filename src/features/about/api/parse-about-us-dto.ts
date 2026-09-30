import type { Locale } from "next-intl";
import type { AboutUsDto } from "@/features/about/api/about-us-dto";
import { routing } from "@/i18n/routing";
import { createRuntimeValidators } from "@/lib/api/runtime-validation";

export class AboutUsContractError extends Error {
  constructor(path: string, expected: string) {
    super('Invalid About Us payload at "' + path + '": expected ' + expected + '.');
    this.name = "AboutUsContractError";
  }
}
const { parseRecord, parseArray, parseString, parseNonEmptyString, parseBoolean } =
  createRuntimeValidators((path, expected) => new AboutUsContractError(path, expected));

function media(value: unknown, path: string): string | null {
  if (value === null) return null;
  const text = parseNonEmptyString(value, path);
  try {
    const url = new URL(text);
    if (url.protocol === "https:" || url.protocol === "http:") return text;
  } catch { /* Report malformed media as a contract failure. */ }
  throw new AboutUsContractError(path, "an HTTP(S) URL or null");
}
function localized(value: unknown, path: string): Partial<Record<Locale, string>> {
  const source = parseRecord(value, path);
  const result: Partial<Record<Locale, string>> = {};
  for (const locale of routing.locales) {
    if (Object.hasOwn(source, locale)) result[locale] = parseString(source[locale], path + "." + locale);
  }
  return result;
}
export function parseAboutUsDto(value: unknown): AboutUsDto {
  const source = parseRecord(value, "response");
  const success = parseBoolean(source.success, "response.success");
  const message = parseString(source.message, "response.message");
  const data = parseRecord(source.data, "response.data");
  if (typeof data.id !== "number" || !Number.isSafeInteger(data.id) || data.id <= 0) {
    throw new AboutUsContractError("response.data.id", "a positive safe integer");
  }
  const keys = new Set<string>();
  const features = Object.hasOwn(data, "features") ? parseArray(data.features, "response.data.features") : [];
  return {
    success, message,
    data: {
      id: data.id,
      hero_title: parseString(data.hero_title, "response.data.hero_title"),
      hero_subtitle: parseString(data.hero_subtitle, "response.data.hero_subtitle"),
      hero_image_url: media(data.hero_image_url, "response.data.hero_image_url"),
      story: parseString(data.story, "response.data.story"),
      vision: parseString(data.vision, "response.data.vision"),
      mission: parseString(data.mission, "response.data.mission"),
      features: features.map((value, index) => {
        const path = "response.data.features[" + index + "]";
        const item = parseRecord(value, path);
        const key = parseNonEmptyString(item.key, path + ".key");
        if (keys.has(key)) throw new AboutUsContractError(path + ".key", "a unique feature key");
        keys.add(key);
        return {
          key,
          title: localized(item.title, path + ".title"),
          subtitle: localized(item.subtitle, path + ".subtitle"),
          icon_url: media(item.icon_url, path + ".icon_url"),
        };
      }),
    },
  };
}
