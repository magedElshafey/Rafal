import { getTranslations } from "next-intl/server";
import { BlogListingSkeleton } from "@/features/blog/components/blog-listing-skeleton";

export default async function BlogLoading() {
  const t = await getTranslations("ContentPages.blog");
  return <BlogListingSkeleton label={t("loading")} />;
}
