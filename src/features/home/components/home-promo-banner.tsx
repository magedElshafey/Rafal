import Image from "next/image";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Link } from "@/i18n/navigation";

type HomePromoBannerProps = {
  alt: string;
  aspectRatio: string;
  href?: string;
  imageUrl: string;
};

function PromoImage({
  alt,
  imageUrl,
}: Pick<HomePromoBannerProps, "alt" | "imageUrl">) {
  return (
    <Image
      fill
      alt={alt}
      className="object-cover"
      sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1439px) calc(100vw - 64px), 1376px"
      src={imageUrl}
    />
  );
}

export function HomePromoBanner({
  alt,
  aspectRatio,
  href,
  imageUrl,
}: HomePromoBannerProps) {
  return (
    <Section spacing="none">
      <Container>
        {href ? (
          <Link
            href={href}
            className="relative block w-full overflow-hidden rounded-lg bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{ aspectRatio }}
          >
            <PromoImage alt={alt} imageUrl={imageUrl} />
          </Link>
        ) : (
          <div
            className="relative w-full overflow-hidden rounded-lg bg-gray-100"
            style={{ aspectRatio }}
          >
            <PromoImage alt={alt} imageUrl={imageUrl} />
          </div>
        )}
      </Container>
    </Section>
  );
}
