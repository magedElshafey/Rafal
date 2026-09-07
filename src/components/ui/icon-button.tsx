import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center rounded-full transition-opacity after:absolute after:left-1/2 after:top-1/2 after:min-h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-100 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        filled:
          "bg-gray-1000 text-gray-0 disabled:bg-gray-100 disabled:text-gray-400",
        outline:
          "border-[length:var(--border-width-emphasis)] border-gray-1000 bg-transparent text-gray-1000 disabled:border-gray-100 disabled:text-gray-400",
        ghost: "bg-transparent text-gray-1000 disabled:text-gray-400",
      },
      size: {
        sm: "size-8 [&_svg]:size-[var(--icon-button-art-sm)]",
        md: "size-10 [&_svg]:size-[var(--icon-button-art-md)]",
        lg: "size-12 [&_svg]:size-[var(--icon-button-art-lg)]",
        productCard:
          "size-[var(--product-card-wishlist-size)] [&_svg]:size-[var(--product-card-wishlist-art-size)]",
      },
    },
    defaultVariants: {
      variant: "filled",
      size: "md",
    },
  },
);

export interface IconButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size, type = "button", variant, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ size, variant }), className)}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";

export { iconButtonVariants };
