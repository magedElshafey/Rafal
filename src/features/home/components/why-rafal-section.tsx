import type { ComponentType } from "react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import {
  CrownIcon,
  HeadsetIcon,
  ShieldCheckIcon,
  TruckIcon,
  type RafalIconProps,
} from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { whyRafalItems } from "@/features/home/data/home-content";

const icons: Record<
  (typeof whyRafalItems)[number]["icon"],
  ComponentType<RafalIconProps>
> = {
  support: HeadsetIcon,
  guarantee: ShieldCheckIcon,
  loyalty: CrownIcon,
  delivery: TruckIcon,
};

export async function WhyRafalSection() {
  const t = await getTranslations("Home.whyRafal");

  return (
    <Section spacing="none" aria-labelledby="why-rafal-title">
      <Container>
        <h2
          id="why-rafal-title"
          className="text-h3 font-medium text-foreground"
        >
          {t("title")}
        </h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {whyRafalItems.map((item) => {
            const Icon = icons[item.icon];

            return (
              <li
                key={item.id}
                className="flex flex-col items-center text-center"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-gold-50 text-gold-500">
                  <Icon size={24} />
                </span>
                <h3 className="mt-3 type-body font-medium text-foreground">
                  {t(`items.${item.id}.title`)}
                </h3>
                <p className="mt-1 max-w-56 type-body-sm text-muted-foreground">
                  {t(`items.${item.id}.description`)}
                </p>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
