import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex font-medium items-center justify-center rounded-full px-3 py-1 type-body-sm whitespace-nowrap w-fit",
  {
    variants: {
      variant: {
        discount: "bg-destructive text-gray-0",
        new: "bg-success text-gray-0",
        personalization: "bg-gold-500 text-gray-0",
        unavailable: "bg-gray-100 text-gray-1000",
        primary: "bg-gold-100  text-gold-600",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
