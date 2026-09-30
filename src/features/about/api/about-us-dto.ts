import type { Locale } from "next-intl";

export type AboutFeatureDto = {
  key: string;
  title: Partial<Record<Locale, string>>;
  subtitle: Partial<Record<Locale, string>>;
  icon_url: string | null;
};
export type AboutUsDto = {
  success: boolean;
  message: string;
  data: {
    id: number;
    hero_title: string;
    hero_subtitle: string;
    hero_image_url: string | null;
    story: string;
    vision: string;
    mission: string;
    features: AboutFeatureDto[];
  };
};
