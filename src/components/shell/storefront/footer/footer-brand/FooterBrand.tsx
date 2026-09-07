import AppLogo from "@/components/shared/AppLogo";

import StoreDownloadLink, {
  type StoreKind,
} from "../store-download-link/StoreDownloadLink";

interface StoreLink {
  eyebrow: string;
  href: string;
  name: string;
  store: StoreKind;
}

interface FooterBrandProps {
  description: string;
  logoLabel: string;
  stores: readonly StoreLink[];
}

export default function FooterBrand({
  description,
  logoLabel,
  stores,
}: FooterBrandProps) {
  return (
    <section className="min-w-0">
      <AppLogo aria-label={logoLabel} className="text-gray-0" />
      <p className="mt-2 max-w-[19rem] type-body text-gray-300">{description}</p>
      <div className="mt-1.5 grid max-w-[19rem] grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
        {stores.map((store) => (
          <StoreDownloadLink key={store.store} {...store} />
        ))}
      </div>
    </section>
  );
}
