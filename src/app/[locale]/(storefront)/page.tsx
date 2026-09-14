import { Suspense } from "react";

import { CategoriesCarouselSkeleton } from "@/features/categories/components/categories-carousel-skeleton";
import { HomeCategories } from "@/features/categories/components/home-categories";
import { HeroCarouselSkeleton } from "@/features/home/components/hero-carousel-skeleton";
import { HomeHero } from "@/features/home/components/home-hero";
import { BestSellersSection } from "@/features/home/components/best-sellers-section";
import { GiftsPromoBanner } from "@/features/home/components/gifts-promo-banner";
import { LatestProductsSection } from "@/features/home/components/latest-products-section";
import { LoyaltyPromoBanner } from "@/features/home/components/loyalty-promo-banner";
import { MensPromoBanner } from "@/features/home/components/mens-promo-banner";
import { ProductCollectionSection } from "@/features/home/components/product-collection-section";
import { ShopByDepartmentSection } from "@/features/home/components/shop-by-department-section";
import { TestimonialsSection } from "@/features/home/components/testimonials-section";
import { WhyRafalSection } from "@/features/home/components/why-rafal-section";

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
    <BestSellersSection />
    <MensPromoBanner />
    <LatestProductsSection />
    <ProductCollectionSection />
    <GiftsPromoBanner />
    <WhyRafalSection />
    <TestimonialsSection />
    <ShopByDepartmentSection />
    <LoyaltyPromoBanner />
  </div>
);

export default HomePage;
