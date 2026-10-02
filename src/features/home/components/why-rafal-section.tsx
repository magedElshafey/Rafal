import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import type { WhyRafalItem } from "@/features/home/api/get-home-data";

export async function WhyRafalSection({
  items,
}: {
  items: readonly WhyRafalItem[];
}) {
  if (items.length === 0) return null;
  const t = await getTranslations("Home.whyRafal");

  return (
    <Reveal>
      <Section spacing="none" aria-labelledby="why-rafal-title">
        <Container>
          <h2
            id="why-rafal-title"
            className="text-h3 font-medium text-foreground"
          >
            {t("title")}
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex flex-col items-center text-center"
              >
                {item.iconUrl ? (
                  <span className="flex size-12 items-center justify-center rounded-full bg-gold-50 text-gold-500">
                    <Image
                      src={item.iconUrl}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 object-contain"
                    />
                  </span>
                ) : null}
                {item.title ? (
                  <h3 className="mt-3 type-body font-bold text-foreground">
                    {item.title}
                  </h3>
                ) : null}
                {item.subtitle ? (
                  <p className="mt-1 max-w-56 type-body-sm text-muted-foreground">
                    {item.subtitle}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </Reveal>
  );
}
