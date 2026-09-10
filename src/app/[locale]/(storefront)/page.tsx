import { Suspense } from "react";

import { HeroCarouselSkeleton } from "@/features/home/components/hero-carousel-skeleton";
import { HomeHero } from "@/features/home/components/home-hero";

const HomePage = () => (
  <div className="main-content-spacing">
    <Suspense fallback={<HeroCarouselSkeleton />}>
      <HomeHero />
    </Suspense>
  </div>
);

export default HomePage;
