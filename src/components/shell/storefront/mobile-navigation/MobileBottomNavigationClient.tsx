"use client";

import { useEffect, useRef, useState } from "react";

import { isNavigationItemActive, mobileNavigationItems, moreNavigationItems } from "@/components/shell/storefront/navigation-config";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon, XIcon } from "@/components/ui/icons/interface-icons";
import type { CategoryNavigationCopy, CategoryNavigationItem } from "@/features/categories/utils/category-navigation";
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
  categoryNavigation: CategoryNavigationCopy;
}

type Props = { copy: MobileNavigationCopy; categories: CategoryNavigationItem[] };
type Surface = "categories" | "more" | null;
const bottomItemClass = "mx-auto flex h-[var(--mobile-bottom-navigation-item-height)] w-[var(--mobile-bottom-navigation-item-width)] min-w-0 flex-col items-center justify-center gap-0.5 type-mobile-navigation-label text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none";
const rowClass = "flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-start type-body-lg text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

export default function MobileBottomNavigationClient(props: Props) {
  const pathname = usePathname();
  return <MobileNavigation key={pathname} {...props} pathname={pathname} />;
}

function MobileNavigation({ copy, categories, pathname }: Props & { pathname: string }) {
  const [surface, setSurface] = useState<Surface>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = categories.find((category) => category.id === selectedId);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const categoryTriggerRef = useRef<HTMLButtonElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const restoreRef = useRef(true);
  const backTargetRef = useRef<number | null>(null);
  const categoryButtonsRef = useRef(new Map<number, HTMLButtonElement>());
  const categoryCopy = copy.categoryNavigation;

  function close() {
    restoreRef.current = true;
    dialogRef.current?.close();
    setSurface(null);
  }

  function open(next: Exclude<Surface, null>) {
    openerRef.current = next === "categories" ? categoryTriggerRef.current : moreTriggerRef.current;
    restoreRef.current = true;
    backTargetRef.current = null;
    setSelectedId(null);
    setSurface(next);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!surface || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 48rem)");
    function resized() {
      if (!desktop.matches) return;
      restoreRef.current = false;
      dialog?.close();
      setSurface(null);
      const target = surface === "categories"
        ? document.getElementById("desktop-categories-trigger")
        : document.querySelector<HTMLElement>("[data-desktop-navigation] a");
      target?.focus();
    }
    function historyChanged() {
      restoreRef.current = true;
      dialog?.close();
      setSurface(null);
    }
    resized();
    desktop.addEventListener("change", resized);
    window.addEventListener("popstate", historyChanged);
    return () => {
      desktop.removeEventListener("change", resized);
      window.removeEventListener("popstate", historyChanged);
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [surface]);

  useEffect(() => {
    if (selectedId !== null) titleRef.current?.focus();
    else if (backTargetRef.current !== null) {
      categoryButtonsRef.current.get(backTargetRef.current)?.focus();
      backTargetRef.current = null;
    }
  }, [selectedId]);

  const isMoreActive = surface === "more" || moreNavigationItems.some((item) => isNavigationItemActive(pathname, item));

  return (
    <nav aria-label={copy.navigation} className="fixed inset-x-0 bottom-0 z-40 box-border h-[calc(var(--mobile-bottom-navigation-height)+env(safe-area-inset-bottom))] border-t border-gray-200 bg-gray-0 pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid h-full grid-cols-5 items-center">
        {mobileNavigationItems.map((item) => {
          const Icon = item.icon;
          const active = isNavigationItemActive(pathname, item) || (item.key === "categories" && surface === "categories");
          const content = <><Icon aria-hidden="true" className="size-[var(--mobile-bottom-navigation-icon-size)] shrink-0" /><span className="max-w-full truncate px-0.5">{copy[item.key]}</span></>;
          return (
            <li key={item.href} className="min-w-0">
              {item.key === "categories" && categories.length > 0 ? (
                <button id="mobile-categories-trigger" ref={categoryTriggerRef} type="button" aria-haspopup="dialog" aria-controls="mobile-navigation-sheet" aria-expanded={surface === "categories"} className={cn(bottomItemClass, active && "bg-gold-50 font-medium text-gold-500")} onClick={() => open("categories")}>
                  {content}
                </button>
              ) : (
                <Link id={item.key === "categories" ? "mobile-categories-trigger" : undefined} href={item.href} aria-current={active ? "page" : undefined} aria-label={copy[item.key]} className={cn(bottomItemClass, active && "bg-gold-50 font-medium text-gold-500")}>{content}</Link>
              )}
            </li>
          );
        })}
        <li className="min-w-0">
          <button ref={moreTriggerRef} type="button" aria-haspopup="dialog" aria-controls="mobile-navigation-sheet" aria-expanded={surface === "more"} aria-label={copy.more} className={cn(bottomItemClass, isMoreActive && "bg-gold-50 font-medium text-gold-500")} onClick={() => open("more")}>
            <MoreHorizontalIcon aria-hidden="true" className="size-[var(--mobile-bottom-navigation-icon-size)] shrink-0" />
            <span className="max-w-full truncate px-0.5">{copy.more}</span>
          </button>
        </li>
      </ul>
      <dialog
        id="mobile-navigation-sheet"
        ref={dialogRef}
        aria-labelledby="mobile-navigation-title"
        className="motion-category-sheet inset-x-0 top-auto bottom-0 m-0 max-h-[80dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-xl border border-gray-200 bg-gray-0 p-0 text-start text-foreground backdrop:bg-gray-1000/50 md:hidden"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClose={(event) => {
          // Ignore a queued close from an earlier lifecycle after rapid reopen.
          if (event.currentTarget.open) return;
          setSurface(null);
          if (restoreRef.current && openerRef.current?.getClientRects().length) openerRef.current.focus();
        }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <div className="px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
            {surface === "categories" && selected ? (
              <button type="button" aria-label={categoryCopy.back} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => {
                backTargetRef.current = selected.id;
                setSelectedId(null);
              }}><ChevronLeftIcon aria-hidden="true" className="size-5 rtl:rotate-180" /></button>
            ) : null}
            <h2 ref={titleRef} tabIndex={-1} id="mobile-navigation-title" className="min-w-0 flex-1 text-h4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{surface === "more" ? copy.moreTitle : selected?.name ?? categoryCopy.title}</h2>
            <button type="button" autoFocus aria-label={surface === "more" ? copy.closeMore : categoryCopy.close} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={close}><XIcon aria-hidden="true" className="size-5" /></button>
          </div>
          {surface === "more" ? (
            <nav aria-label={copy.moreNavigation} className="pt-2"><ul className="space-y-1">
              {moreNavigationItems.map((item) => (
                <li key={item.href}><Link href={item.href} aria-current={isNavigationItemActive(pathname, item) ? "page" : undefined} className={rowClass} onNavigate={close}>{copy[item.key]}</Link></li>
              ))}
            </ul></nav>
          ) : (
            <nav aria-label={categoryCopy.title} className="pt-2">
              <ul hidden={!!selected} className="space-y-1">
                {categories.map((category) => (
                  <li key={category.id}>
                    {category.children.length ? (
                      <button ref={(element) => { if (element) categoryButtonsRef.current.set(category.id, element); else categoryButtonsRef.current.delete(category.id); }} type="button" className={rowClass} onClick={() => setSelectedId(category.id)}>
                        {category.name}<ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 rtl:rotate-180" />
                      </button>
                    ) : <Link href={category.href} prefetch={false} className={rowClass} onNavigate={close}>{category.name}</Link>}
                  </li>
                ))}
              </ul>
              {selected ? <>
                <Link href={selected.href} prefetch={false} className={cn(rowClass, "font-medium text-gold-600")} onNavigate={close}>{categoryCopy.viewProducts}</Link>
                <ul className="mt-2 space-y-1">{selected.children.map((child) => <li key={child.id}><Link href={child.href} prefetch={false} className={rowClass} onNavigate={close}>{child.name}</Link></li>)}</ul>
              </> : null}
              <div className="mt-3 border-t border-gray-200 pt-2"><Link href="/categories" prefetch={false} className={cn(rowClass, "font-medium text-gold-600")} onNavigate={close}>{categoryCopy.viewAll}</Link></div>
            </nav>
          )}
        </div>
      </dialog>
    </nav>
  );
}
