export type StaticPage = {
  id: number;
  slug: string;
  title: string;
  // Raw backend HTML. Render only through SafeHtml with the static-page policy.
  contentHtml: string;
  hasMeaningfulContent: boolean;
};
