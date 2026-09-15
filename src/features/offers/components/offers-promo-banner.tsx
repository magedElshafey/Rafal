import { HomePromoBanner } from "@/features/home/components/home-promo-banner";

type OffersPromoBannerProps = {
  alt: string;
  imageUrl?: string;
};

export function OffersPromoBanner({
  alt,
  imageUrl,
}: OffersPromoBannerProps) {
  if (!imageUrl) return null;

  return (
    <div className="mt-6">
      <HomePromoBanner
        alt={alt}
        aspectRatio="1320 / 424"
        imageUrl={imageUrl}
      />
    </div>
  );
}
