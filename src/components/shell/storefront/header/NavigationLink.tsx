"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  isNavigationItemActive,
  type ShellNavigationItem,
} from "@/components/shell/storefront/navigation-config";

type AppLinkProps = {
  href: ShellNavigationItem["href"];
  label: string;
  match: ShellNavigationItem["match"];
};

const NavigationLink = ({ href, label, match }: AppLinkProps) => {
  const pathname = usePathname();
  const isActive = isNavigationItemActive(pathname, { href, match });

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative inline-flex rounded-full py-1.5 px-3.5 type-card-price font-medium text-foreground transition-colors",
        "type-card-price",
        "hover:text-gold-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive && "text-primary bg-accent",
      )}
    >
      {label}
    </Link>
  );
};

export default NavigationLink;
