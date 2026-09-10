import { Skeleton } from "@/components/ui/skeleton";
import {
  HomeHeroFrame,
  HomeHeroLayout,
} from "@/features/home/components/home-hero-layout";

export function HeroCarouselSkeleton() {
  return (
    <HomeHeroLayout aria-hidden="true">
      <HomeHeroFrame>
        <Skeleton className="size-full rounded-lg" />
      </HomeHeroFrame>
      <div className="mt-3 flex h-2 items-center justify-center gap-1">
        <Skeleton className="h-2 w-5 rounded-full" />
        <Skeleton className="size-2 rounded-full" />
        <Skeleton className="size-2 rounded-full" />
      </div>
    </HomeHeroLayout>
  );
}
