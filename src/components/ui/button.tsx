import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr/CircleNotch";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-opacity motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-100",
  {
    variants: {
      variant: {
        primary:
          "bg-gray-1000 text-gray-0 disabled:bg-gray-100 disabled:text-gray-400",
        secondary:
          "bg-gold-500 text-gray-1000 disabled:bg-gray-100 disabled:text-gray-400",
        outline:
          "border-[length:var(--border-width-emphasis)] border-gray-1000 bg-transparent text-gray-1000 disabled:border-gray-100 disabled:text-gray-400",
        ghost:
          "bg-transparent text-gray-1000 disabled:text-gray-400",
      },
      size: {
        sm: "h-9 px-3.5 type-ui-sm",
        md: "h-11 px-5 type-body font-medium",
        lg: "h-13 px-6 type-body-lg font-medium",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      loading = false,
      loadingLabel,
      size,
      type = "button",
      variant,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ size, variant }), className)}
      disabled={disabled || loading}
      {...props}
      aria-busy={loading || undefined}
      aria-label={loading ? loadingLabel || props["aria-label"] : props["aria-label"]}
    >
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>
        {children}
      </span>
      {loading ? (
        <CircleNotchIcon
          aria-hidden="true"
          className="absolute size-4 animate-spin motion-reduce:animate-none"
        />
      ) : null}
    </button>
  ),
);

Button.displayName = "Button";

export { buttonVariants };
