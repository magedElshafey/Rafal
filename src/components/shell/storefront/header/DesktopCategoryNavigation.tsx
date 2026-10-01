"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons/interface-icons";
import type { CategoryNavigationCopy, CategoryNavigationItem } from "@/features/categories/utils/category-navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = { categories: CategoryNavigationItem[]; copy: CategoryNavigationCopy };
const itemClass = "flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-start type-body text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

export function DesktopCategoryNavigation(props: Props) {
  const pathname = usePathname();
  return <CategoryDisclosure key={pathname} {...props} pathname={pathname} />;
}

function CategoryDisclosure({ categories, copy, pathname }: Props & { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(() =>
    categories.find((category) => category.href === pathname && category.children.length)?.id
      ?? categories.find((category) => category.children.length)?.id,
  );
  const activeCategory = categories.find((category) => category.id === selectedId);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const detailId = useId();
  const isCategoryRoute = pathname === "/categories" || pathname.startsWith("/categories/");

  function close(restoreFocus = false) {
    if (restoreFocus) triggerRef.current?.focus();
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root?.contains(event.target)) {
        if (root?.contains(document.activeElement)) triggerRef.current?.focus();
        setOpen(false);
      }
    }
    function historyChanged() {
      if (root?.contains(document.activeElement)) triggerRef.current?.focus();
      setOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 48rem)");
    function resized() {
      if (desktop.matches) return;
      if (root?.contains(document.activeElement)) document.getElementById("mobile-categories-trigger")?.focus();
      setOpen(false);
    }
    resized();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("popstate", historyChanged);
    desktop.addEventListener("change", resized);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("popstate", historyChanged);
      desktop.removeEventListener("change", resized);
    };
  }, [open]);

  return (
    <div ref={rootRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={(event) => {
      if (open && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    }}>
      <button id="desktop-categories-trigger" ref={triggerRef} type="button" aria-expanded={open} aria-controls={panelId}
        className={cn("inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 py-1.5 type-card-price font-medium text-foreground hover:text-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", (open || isCategoryRoute) && "bg-accent text-primary")}
        onClick={() => setOpen((value) => !value)}>
        {copy.title}<ChevronDownIcon aria-hidden="true" className={cn("size-4", open && "rotate-180")} />
      </button>
      <div id={panelId} aria-label={copy.title} role="region" aria-hidden={!open} inert={!open} data-open={open}
        className="motion-category-panel absolute inset-x-4 top-full z-50 mx-auto max-h-[70dvh] max-w-3xl overflow-y-auto rounded-xl border border-gray-200 bg-background text-start">
        <div className={cn("p-4", activeCategory && "grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4")}>
          <ul className={cn("space-y-1", !activeCategory && "grid grid-cols-2 gap-2 space-y-0")}>
            {categories.map((category) => <li key={category.id}>
              {category.children.length ? (
                <button type="button" aria-expanded={activeCategory?.id === category.id} aria-controls={detailId}
                  className={cn(itemClass, activeCategory?.id === category.id && "bg-gold-50 font-medium text-gold-600")}
                  onClick={() => setSelectedId(category.id)}>
                  {category.name}<ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 rtl:rotate-180" />
                </button>
              ) : <Link href={category.href} prefetch={false} className={itemClass} onNavigate={() => close(true)} aria-current={pathname === category.href ? "location" : undefined}>{category.name}</Link>}
            </li>)}
          </ul>
          {activeCategory ? <section id={detailId} aria-labelledby={`${detailId}-title`} className="border-s border-gray-200 ps-4">
            <h2 id={`${detailId}-title`} className="px-3 py-2 text-h4 font-medium">{activeCategory.name}</h2>
            <Link href={activeCategory.href} prefetch={false} className={cn(itemClass, "font-medium text-gold-600")} onNavigate={() => close(true)}>{copy.viewProducts}</Link>
            <ul className="mt-2 grid grid-cols-2 gap-1">{activeCategory.children.map((child) => <li key={child.id}>
              <Link href={child.href} prefetch={false} className={itemClass} onNavigate={() => close(true)}>{child.name}</Link>
            </li>)}</ul>
          </section> : null}
        </div>
        <div className="border-t border-gray-200 p-3"><Link href="/categories" prefetch={false} className={cn(itemClass, "font-medium text-gold-600")} onNavigate={() => close(true)}>{copy.viewAll}</Link></div>
      </div>
    </div>
  );
}
