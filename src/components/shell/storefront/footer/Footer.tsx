import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";

import FooterBottom from "./footer-bottom/FooterBottom";
import FooterBrand from "./footer-brand/FooterBrand";
import FooterLinksColumn from "./footer-links/FooterLinksColumn";
import NewsLetter from "./news-letter/NewsLetter";

const quickLinks = [
  { href: "/about", key: "about" },
  { href: "/returns", key: "returns" },
  { href: "/shipping", key: "shipping" },
  { href: "/terms", key: "terms" },
  { href: "/privacy", key: "privacy" },
  { href: "/contact", key: "complaints" },
] as const;

const shoppingLinks = [
  { href: "/categories/womens-jewelry", key: "womensJewelry" },
  { href: "/categories/mens-gifts", key: "mensGifts" },
  { href: "/categories/car-accessories", key: "carAccessories" },
  { href: "/categories/perfumes", key: "perfumes" },
  { href: "/categories/personalized", key: "personalized" },
] as const;

const storeDestinations = {
  "app-store": "https://www.apple.com/app-store/",
  "google-play": "https://play.google.com/store",
} as const;

export default async function Footer() {
  const t = await getTranslations("Common.footer");

  const translatedQuickLinks = quickLinks.map(({ href, key }) => ({
    href,
    label: t(`quickLinks.items.${key}`),
  }));
  const translatedShoppingLinks = shoppingLinks.map(({ href, key }) => ({
    href,
    label: t(`shopping.items.${key}`),
  }));
  const stores = (
    Object.keys(storeDestinations) as Array<keyof typeof storeDestinations>
  ).map((store) => ({
    eyebrow: t(`stores.${store}.eyebrow`),
    href: storeDestinations[store],
    name: t(`stores.${store}.name`),
    store,
  }));

  return (
    <footer className="w-full overflow-x-clip bg-gray-1000 text-gray-0 mt-16 md:mt-24">
      <Container
        size="full"
        className="grid min-h-[var(--footer-columns-min-height)] grid-cols-1 gap-10 py-10 md:grid-cols-2 md:gap-x-12 xl:grid-cols-[var(--footer-desktop-columns)] xl:justify-between xl:gap-x-0 xl:px-[var(--footer-desktop-padding-inline)] xl:pt-13 xl:pb-7"
      >
        <FooterBrand
          description={t("brand.description")}
          logoLabel={t("brand.homeLabel")}
          stores={stores}
        />
        <FooterLinksColumn
          id="footer-quick-links"
          title={t("quickLinks.title")}
          links={translatedQuickLinks}
        />
        <FooterLinksColumn
          id="footer-shopping-links"
          title={t("shopping.title")}
          links={translatedShoppingLinks}
        />
        <NewsLetter
          title={t("newsletter.title")}
          description={t("newsletter.description")}
          emailLabel={t("newsletter.emailLabel")}
          placeholder={t("newsletter.placeholder")}
          submitLabel={t("newsletter.submit")}
        />
      </Container>
      <FooterBottom
        paymentMethods={t("bottom.paymentMethods")}
        copyright={t("bottom.copyright")}
      />
    </footer>
  );
}
