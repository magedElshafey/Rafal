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
    <section className="space-y-3 min-w-0">
      <AppLogo aria-label={logoLabel} className="text-gray-0" />
      <p className="max-w-76 type-body text-gray-400">{description}</p>
      <div className="grid max-w-76 gap-2 grid-cols-2">
        {stores.map((store) => (
          <StoreDownloadLink key={store.store} {...store} />
        ))}
      </div>
    </section>
  );
}
