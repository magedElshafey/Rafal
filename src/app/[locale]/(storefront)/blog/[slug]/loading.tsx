import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { BlogCardSkeleton } from "@/features/blog/components/blog-listing-skeleton";

// Representative optional category/related slots; no article content is assumed.
export default async function BlogDetailsLoading() {
  const t = await getTranslations("ContentPages.blog");
  return (
    <div className="main-content-spacing" aria-busy="true" aria-label={t("loadingArticle")}>
      <div aria-hidden="true">
        <Container><Skeleton className="h-4 w-64 max-w-full" /></Container>
        <Container size="default" className="mt-6">
          <div className="space-y-4">
            <Skeleton className="mx-auto h-5 w-24" />
            <Skeleton className="mx-auto h-8 w-4/5 lg:h-9" />
            <Skeleton className="mx-auto h-[var(--text-caption--line-height)] w-64 max-w-full" />
          </div>
          <Skeleton className="mt-5 aspect-video rounded-lg" />
        </Container>
        <Container size="wide" className="mt-6 md:mt-8">
          <div className="mx-auto max-w-prose space-y-6 type-body-lg leading-8">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-4 py-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
            ))}
          </div>
          <div className="mt-10 md:mt-12">
            <Skeleton className="h-8 w-48" />
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => <BlogCardSkeleton key={index} compact />)}
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
