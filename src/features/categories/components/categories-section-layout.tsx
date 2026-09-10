import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

export const categorySlideClassName =
  "basis-[136px] sm:basis-40 lg:basis-[300px]";

type CategoriesSectionLayoutProps = ComponentPropsWithoutRef<"section"> & {
  heading: ReactNode;
  headingId: string;
};

export function CategoriesSectionLayout({
  children,
  className,
  heading,
  headingId,
  ...props
}: CategoriesSectionLayoutProps) {
  return (
    <Section
      {...props}
      aria-labelledby={headingId}
      className={cn("py-5", className)}
      spacing="none"
    >
      <Container>
        <h2 id={headingId} className="text-h3 font-medium text-foreground">
          {heading}
        </h2>
        <div className="mt-5">{children}</div>
      </Container>
    </Section>
  );
}
