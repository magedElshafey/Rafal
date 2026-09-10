"use client";

import Image from "next/image";
import type { Locale } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { SearchBox } from "@/components/shared/SearchBox";
import { searchProducts } from "@/features/search/services/product-search-service";
import type { SearchProduct } from "@/features/search/types";

const SEARCH_DEBOUNCE_MS = 300;

export type SearchControllerCopy = {
  label: string;
  placeholder: string;
  clear: string;
  loading: string;
  noResults: string;
  suggestions: string;
};

type SearchControllerProps = {
  copy: SearchControllerCopy;
  locale: Locale;
};

type SearchState = "idle" | "loading" | "results" | "empty";

export function SearchController({ copy, locale }: SearchControllerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = "storefront-product-suggestions";

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    let active = true;

    const timer = window.setTimeout(() => {
      searchProducts(normalizedQuery, locale).then((results) => {
        if (!active) return;
        setProducts(results);
        setState(results.length > 0 ? "results" : "empty");
        setActiveIndex(-1);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [locale, query]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    const hasQuery = Boolean(nextQuery.trim());

    setQuery(nextQuery);
    setProducts([]);
    setState(hasQuery ? "loading" : "idle");
    setActiveIndex(-1);
    setIsOpen(hasQuery);
  };

  const selectProduct = (product: SearchProduct) => {
    setQuery(product.name);
    setProducts([]);
    setState("idle");
    setActiveIndex(-1);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (state !== "results" || products.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current + 1) % products.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? products.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectProduct(products[activeIndex]);
    }
  };

  const clear = () => {
    setQuery("");
    setProducts([]);
    setState("idle");
    setActiveIndex(-1);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const showPanel = isOpen && state !== "idle";
  const priceFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });

  return (
    <div
      ref={rootRef}
      className="relative w-full md:w-[var(--header-search-width)]"
    >
      <SearchBox
        ref={inputRef}
        id="storefront-product-search"
        name="query"
        label={copy.label}
        placeholder={copy.placeholder}
        autoComplete="off"
        value={query}
        clearLabel={copy.clear}
        onClear={clear}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={showPanel}
        aria-activedescendant={
          activeIndex >= 0
            ? `${listboxId}-${products[activeIndex]?.id}`
            : undefined
        }
        onChange={handleChange}
        onFocus={() => query.trim() && setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={copy.suggestions}
          aria-busy={state === "loading" || undefined}
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-md border border-gray-200 bg-gray-0"
        >
          {state === "loading" ? (
            <p
              className="px-4 py-6 text-center type-body text-gray-600"
              aria-live="polite"
            >
              {copy.loading}
            </p>
          ) : state === "empty" ? (
            <p
              className="px-4 py-6 text-center type-body text-gray-600"
              aria-live="polite"
            >
              {copy.noResults}
            </p>
          ) : (
            products.map((product, index) => (
              <button
                key={product.id}
                id={`${listboxId}-${product.id}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectProduct(product)}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2 text-start last:border-b-0 hover:bg-gray-50 focus-visible:bg-gold-50 focus-visible:outline-none aria-selected:bg-gold-50"
              >
                <Image
                  src={product.thumbnail.src}
                  alt={product.thumbnail.alt}
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-md object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-body font-medium text-gray-1000">
                    {product.name}
                  </span>
                  <bdi className="mt-1 block type-ui-sm text-gray-700">
                    {priceFormatter.format(product.price.amount)}
                  </bdi>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
