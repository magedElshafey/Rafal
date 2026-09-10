import type { ComponentPropsWithoutRef } from "react";

import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const HOME_HERO_ASPECT_RATIO = "22 / 7";

export function HomeHeroLayout({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section {...props} className={cn(className)}>
      <Container>
        <div className="mx-auto w-full max-w-[1320px]">{children}</div>
      </Container>
    </section>
  );
}

export function HomeHeroFrame({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "relative overflow-hidden rounded-lg bg-gray-100",
        className,
      )}
      style={{ aspectRatio: HOME_HERO_ASPECT_RATIO, ...props.style }}
    />
  );
}
