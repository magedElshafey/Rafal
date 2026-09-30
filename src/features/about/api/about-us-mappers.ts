import type { Locale } from "next-intl";
import type { AboutUsDto } from "@/features/about/api/about-us-dto";
import type { AboutUsPageData } from "@/features/about/types/about-us.types";

function resolveFeatureText(value: Partial<Record<Locale, string>>, locale: Locale): string {
  return value[locale]?.trim() || value.ar?.trim() || "";
}
export function mapAboutUsDto(dto: AboutUsDto, locale: Locale): AboutUsPageData {
  const data = dto.data;
  return {
    id: data.id,
    hero: { title: data.hero_title, subtitle: data.hero_subtitle, imageUrl: data.hero_image_url },
    story: data.story,
    vision: data.vision,
    mission: data.mission,
    features: data.features.flatMap((feature) => {
      const title = resolveFeatureText(feature.title, locale);
      const subtitle = resolveFeatureText(feature.subtitle, locale);
      return title || subtitle ? [{ key: feature.key, title, subtitle, iconUrl: feature.icon_url }] : [];
    }),
  };
}
