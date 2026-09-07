import type { ComponentProps } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const AppLogo = ({
  "aria-label": ariaLabel,
  className,
  ...props
}: ComponentProps<"a">) => {
  return (
    <Link
      {...props}
      href="/"
      aria-label={ariaLabel ?? "Rafal - Home"}
      className={cn(
        "inline-flex items-center rounded-sm font-bold uppercase text-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-xl xl:text-2xl",
        className,
      )}
    >
      Rafal
    </Link>
  );
};

export default AppLogo;
