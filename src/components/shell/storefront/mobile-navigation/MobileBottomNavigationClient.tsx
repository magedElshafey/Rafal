"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import {
  isNavigationItemActive,
  mobileNavigationItems,
  moreNavigationItems,
} from "@/components/shell/storefront/navigation-config";
import {
  MoreHorizontalIcon,
  XIcon,
} from "@/components/ui/icons/interface-icons";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface MobileNavigationCopy {
  about_us: string;
  blogs: string;
  cart: string;
  categories: string;
  closeMore: string;
  home: string;
  more: string;
  moreNavigation: string;
  moreTitle: string;
  navigation: string;
  offers: string;
  wishlist: string;
}

interface MobileNavigationItemProps {
  active: boolean;
  item: (typeof mobileNavigationItems)[number];
  label: string;
}

function MobileNavigationItem({
  active,
  item,
  label,
}: MobileNavigationItemProps) {
  const Icon = item.icon;

  return (
    <li className="min-w-0">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        className={cn(
          "mx-auto flex h-[var(--mobile-bottom-navigation-item-height)] w-[var(--mobile-bottom-navigation-item-width)] min-w-0 flex-col items-center justify-center gap-0.5 rounded-none type-mobile-navigation-label text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          active && "bg-gold-50 font-medium text-gold-500",
        )}
      >
        <Icon
          aria-hidden="true"
          className="size-[var(--mobile-bottom-navigation-icon-size)] shrink-0"
        />
        <span className="max-w-full truncate px-0.5">{label}</span>
      </Link>
    </li>
  );
}

interface MoreNavigationSheetProps {
  copy: MobileNavigationCopy;
  items: typeof moreNavigationItems;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pathname: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

function MoreNavigationSheet({
  copy,
  items,
  onOpenChange,
  open,
  pathname,
  triggerRef,
}: MoreNavigationSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      id="more-navigation-sheet"
      ref={dialogRef}
      aria-labelledby="more-navigation-title"
      className="inset-x-0 top-auto bottom-0 m-0 max-h-[80dvh] w-full max-w-none overflow-y-auto rounded-t-xl border border-gray-200 bg-gray-0 p-0 text-start text-foreground backdrop:bg-gray-1000/50 md:hidden"
      onCancel={() => onOpenChange(false)}
      onClose={() => {
        onOpenChange(false);
        triggerRef.current?.focus();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className="px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-3">
          <h2 id="more-navigation-title" className="text-h4 font-medium">
            {copy.moreTitle}
          </h2>
          <button
            type="button"
            aria-label={copy.closeMore}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onOpenChange(false)}
          >
            <XIcon aria-hidden="true" className="size-5" />
          </button>
        </div>

        <nav aria-label={copy.moreNavigation} className="pt-2">
          <ul className="space-y-1">
            {items.map((item) => {
              const active = isNavigationItemActive(pathname, item);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center rounded-md px-3 type-body-lg text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active && "bg-gold-50 font-medium text-gold-600",
                    )}
                    onClick={() => onOpenChange(false)}
                  >
                    {copy[item.key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </dialog>
  );
}

interface MobileBottomNavigationClientProps {
  copy: MobileNavigationCopy;
}

export default function MobileBottomNavigationClient({
  copy,
}: MobileBottomNavigationClientProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const isMoreActive =
    isMoreOpen ||
    moreNavigationItems.some((item) =>
      isNavigationItemActive(pathname, item),
    );

  return (
    <nav
      aria-label={copy.navigation}
      className="fixed inset-x-0 bottom-0 z-40 box-border h-[calc(var(--mobile-bottom-navigation-height)+env(safe-area-inset-bottom))] border-t border-gray-200 bg-gray-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid h-full grid-cols-5 items-center">
        {mobileNavigationItems.map((item) => (
          <MobileNavigationItem
            key={item.href}
            item={item}
            label={copy[item.key]}
            active={isNavigationItemActive(pathname, item)}
          />
        ))}
        <li className="min-w-0">
          <button
            ref={moreTriggerRef}
            type="button"
            aria-controls="more-navigation-sheet"
            aria-expanded={isMoreOpen}
            aria-label={copy.more}
            className={cn(
              "mx-auto flex h-[var(--mobile-bottom-navigation-item-height)] w-[var(--mobile-bottom-navigation-item-width)] min-w-0 flex-col items-center justify-center gap-0.5 type-mobile-navigation-label text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              isMoreActive && "bg-gold-50 font-medium text-gold-500",
            )}
            onClick={() => setIsMoreOpen(true)}
          >
            <MoreHorizontalIcon
              aria-hidden="true"
              className="size-[var(--mobile-bottom-navigation-icon-size)] shrink-0"
            />
            <span className="max-w-full truncate px-0.5">{copy.more}</span>
          </button>
        </li>
      </ul>

      <MoreNavigationSheet
        copy={copy}
        items={moreNavigationItems}
        open={isMoreOpen}
        pathname={pathname}
        triggerRef={moreTriggerRef}
        onOpenChange={setIsMoreOpen}
      />
    </nav>
  );
}
