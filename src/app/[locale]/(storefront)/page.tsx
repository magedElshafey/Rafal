import { Suspense } from "react";

import { CategoriesCarouselSkeleton } from "@/features/categories/components/categories-carousel-skeleton";
import { HomeCategories } from "@/features/categories/components/home-categories";
import { HeroCarouselSkeleton } from "@/features/home/components/hero-carousel-skeleton";
import { HomeHero } from "@/features/home/components/home-hero";

const HomePage = () => (
  <div className="main-content-spacing section-spacing">
    <Suspense fallback={<HeroCarouselSkeleton />}>
      <HomeHero />
    </Suspense>
    <Suspense fallback={<CategoriesCarouselSkeleton />}>
      <HomeCategories />
    </Suspense>
    <Suspense fallback={<HeroCarouselSkeleton />}>
      <HomeHero />
    </Suspense>
  </div>
);

export default HomePage;
