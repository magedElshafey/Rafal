import { Skeleton } from "@/components/ui/skeleton";
import {
  CategoriesSectionLayout,
  categorySlideClassName,
} from "@/features/categories/components/categories-section-layout";

const headingId = "home-categories-skeleton-heading";

export function CategoriesCarouselSkeleton() {
  return (
    <CategoriesSectionLayout
      aria-hidden="true"
      heading={<Skeleton className="ms-auto h-7 w-40" />}
      headingId={headingId}
    >
      <div className="overflow-hidden">
        <div className="flex">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className={`min-w-0 shrink-0 ${categorySlideClassName}`}
            >
              <div className="me-auto flex w-[120px] flex-col items-center">
                <Skeleton className="size-[120px] rounded-full" />
                <Skeleton className="mt-3 h-5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </CategoriesSectionLayout>
  );
}
