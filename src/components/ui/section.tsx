import type { ComponentPropsWithoutRef } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const sectionVariants = cva("", {
  variants: {
    spacing: {
      none: "py-0",
      sm: "py-4",
      md: "py-8",
      lg: "py-12",
      xl: "py-16",
    },
  },
  defaultVariants: {
    spacing: "md",
  },
});

type SectionProps = ComponentPropsWithoutRef<"section"> &
  VariantProps<typeof sectionVariants>;

function Section({ className, spacing, ...props }: SectionProps) {
  return (
    <section
      className={cn(sectionVariants({ spacing }), className)}
      {...props}
    />
  );
}

export { Section, sectionVariants };
export type { SectionProps };
