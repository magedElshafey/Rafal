export type AboutUsFeature = {
  key: string;
  title: string;
  subtitle: string;
  iconUrl: string | null;
};
export type AboutUsPageData = {
  id: number;
  hero: { title: string; subtitle: string; imageUrl: string | null };
  story: string;
  vision: string;
  mission: string;
  features: AboutUsFeature[];
};
