import { getLocale } from "next-intl/server";
import { Suspense } from "react";

import { CategoriesCarouselSkeleton } from "@/features/categories/components/categories-carousel-skeleton";
import { HomeCategories } from "@/features/categories/components/home-categories";
import { getHomeData } from "@/features/home/api/get-home-data";
import { BestSellersSection } from "@/features/home/components/best-sellers-section";
import { GiftsPromoBanner } from "@/features/home/components/gifts-promo-banner";
import { HeroCarouselSkeleton } from "@/features/home/components/hero-carousel-skeleton";
import { HomeHero } from "@/features/home/components/home-hero";
import { HomeLocationNotice } from "@/features/home/components/home-location-notice";
import { LatestProductsSection } from "@/features/home/components/latest-products-section";
import { LoyaltyPromoBanner } from "@/features/home/components/loyalty-promo-banner";
import { MensPromoBanner } from "@/features/home/components/mens-promo-banner";
import { ProductCollectionSection } from "@/features/home/components/product-collection-section";
import { ShopByDepartmentSection } from "@/features/home/components/shop-by-department-section";
import { TestimonialsSection } from "@/features/home/components/testimonials-section";
import { WhyRafalSection } from "@/features/home/components/why-rafal-section";
import { resolveCurrentLocation } from "@/features/location/server/resolve-current-location";

const HomePage = async () => {
  const locale = await getLocale();
  const city = await resolveCurrentLocation(locale);
  const home = await getHomeData(city?.id ?? null);

  return (
    <div className="main-content-spacing section-spacing">
      <Suspense fallback={<HeroCarouselSkeleton />}>
        <HomeHero banners={home.banners} />
      </Suspense>
      <Suspense fallback={<CategoriesCarouselSkeleton />}>
        <HomeCategories categories={home.categories} />
      </Suspense>
      <Suspense fallback={<HeroCarouselSkeleton />}>
        <HomeHero banners={home.banners} />
      </Suspense>
      {home.location.city === null ? <HomeLocationNotice /> : null}
      <BestSellersSection products={home.featured} />
      <MensPromoBanner />
      <LatestProductsSection
        categories={home.categories}
        products={home.newArrivals}
      />
      <ProductCollectionSection kind="onDiscount" products={home.onDiscount} />
      <ProductCollectionSection
        kind="personalizable"
        products={home.personalizable}
      />
      <GiftsPromoBanner />
      <WhyRafalSection />
      <TestimonialsSection />
      <ShopByDepartmentSection categories={home.categories} />
      <LoyaltyPromoBanner />
    </div>
  );
};

export default HomePage;
