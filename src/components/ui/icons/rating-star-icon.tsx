import { forwardRef, type SVGProps } from "react";

export interface RatingStarIconProps extends SVGProps<SVGSVGElement> {
  label?: string;
  size?: number | string;
}

export const RatingStarIcon = forwardRef<SVGSVGElement, RatingStarIconProps>(
  ({ label, size = "1em", ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 14 14"
      width={size}
      height={size}
      fill="none"
      focusable="false"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      {...props}
    >
      <path
        d="M7 0 8.572 4.837h5.085L9.543 7.826l1.572 4.837L7 9.674l-4.115 2.989 1.572-4.837L.343 4.837h5.085L7 0Z"
        fill="currentColor"
      />
    </svg>
  ),
);

RatingStarIcon.displayName = "RatingStarIcon";
