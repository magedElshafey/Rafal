"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AppLinkProps = {
  href: string;
  label: string;
};

const NavigationLink = ({ href, label }: AppLinkProps) => {
  const pathname = usePathname();

  const isActive =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative inline-flex rounded-full py-1.5 px-3.5 type-card-price font-medium text-foreground transition-colors",
        "hover:text-gold-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive && "text-gold-500 bg-gold-50 ",
      )}
    >
      {label}
    </Link>
  );
};

export default NavigationLink;
