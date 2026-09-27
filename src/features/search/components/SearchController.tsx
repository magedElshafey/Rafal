"use client";

import { useQuery } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { SearchBox } from "@/components/shared/SearchBox";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { productSearchAutocompleteQuery } from "@/features/search/api/product-search-autocomplete-query";
import type { ListingProduct } from "@/features/products/types/product-listing.types";
import { normalizeProductSearchQuery } from "@/features/products/utils/catalogue-listing-search-params";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const searchDebounceMs = 300;
const minimumSearchLength = 3;
const autocompleteStaleTimeMs = 60_000;

export type SearchControllerCopy = {
  label: string;
  placeholder: string;
  clear: string;
  loading: string;
  noResults: string;
  error: string;
  retry: string;
  suggestions: string;
};

type SearchControllerProps = {
  cityId: number | null;
  copy: SearchControllerCopy;
  locale: Locale;
};

function SuggestionSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0">
      <Skeleton className="size-12 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SearchController(props: SearchControllerProps) {
  const searchParams = useSearchParams();
  const initialSearch =
    normalizeProductSearchQuery(searchParams.get("search")) ?? "";

  return (
    <SearchControllerState
      key={initialSearch}
      {...props}
      initialSearch={initialSearch}
    />
  );
}

function SearchControllerState({
  cityId,
  copy,
  initialSearch,
  locale,
}: SearchControllerProps & { initialSearch: string }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = `product-search-${useId().replace(/:/g, "")}`;
  const [draft, setDraft] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    initialSearch.length >= minimumSearchLength ? initialSearch : "",
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedDraft = normalizeProductSearchQuery(draft) ?? "";
  const hasValidDraft = normalizedDraft.length >= minimumSearchLength;
  const effectiveDebouncedSearch = hasValidDraft ? debouncedSearch : "";
  const isDebouncing =
    hasValidDraft && normalizedDraft !== effectiveDebouncedSearch;

  useEffect(() => {
    if (!hasValidDraft) return;

    const timer = window.setTimeout(
      () => setDebouncedSearch(normalizedDraft),
      searchDebounceMs,
    );
    return () => window.clearTimeout(timer);
  }, [hasValidDraft, normalizedDraft]);

  const suggestionsQuery = useQuery({
    queryKey: productSearchAutocompleteQuery.key({
      cityId,
      locale,
      search: effectiveDebouncedSearch,
    }),
    queryFn: ({ signal }) =>
      productSearchAutocompleteQuery.fetch({
        cityId,
        locale,
        search: effectiveDebouncedSearch,
        signal,
      }),
    enabled: isOpen && hasValidDraft && !isDebouncing,
    retry: false,
    staleTime: autocompleteStaleTimeMs,
  });
  const products = suggestionsQuery.data ?? [];
  const showPanel = isOpen && hasValidDraft;
  const showLoading =
    isDebouncing || suggestionsQuery.isPending || suggestionsQuery.isFetching;
  const showSuggestions =
    !showLoading && !suggestionsQuery.isError && products.length > 0;
  const activeProduct = showSuggestions ? products[activeIndex] : undefined;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const navigateToProduct = (product: ListingProduct) => {
    setIsOpen(false);
    setActiveIndex(-1);
    router.push(`/products/${product.slug}`);
  };

  const submitSearch = () => {
    setIsOpen(false);
    setActiveIndex(-1);
    router.push(
      normalizedDraft
        ? `/products?search=${encodeURIComponent(normalizedDraft)}`
        : "/products",
    );
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextDraft = event.target.value;
    const nextSearch = normalizeProductSearchQuery(nextDraft) ?? "";
    setDraft(nextDraft);
    setActiveIndex(-1);
    setIsOpen(nextSearch.length >= minimumSearchLength);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (showPanel && activeProduct) navigateToProduct(activeProduct);
      else submitSearch();
      return;
    }

    if (products.length === 0 || showLoading || suggestionsQuery.isError)
      return;

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
    }
  };

  const clear = () => {
    setDraft("");
    setDebouncedSearch("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "SAR",
      }),
    [locale],
  );

  return (
    <div
      ref={rootRef}
      className="relative w-full md:w-[var(--header-search-width)]"
    >
      <SearchBox
        ref={inputRef}
        id="storefront-product-search"
        name="search"
        label={copy.label}
        placeholder={copy.placeholder}
        autoComplete="off"
        value={draft}
        clearLabel={copy.clear}
        onClear={clear}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={showPanel}
        aria-activedescendant={
          activeProduct ? `${listboxId}-${activeProduct.id}` : undefined
        }
        onChange={handleChange}
        onFocus={() => hasValidDraft && setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {showPanel ? (
        <div
          id={listboxId}
          role={showSuggestions ? "listbox" : undefined}
          aria-label={copy.suggestions}
          aria-busy={showLoading || undefined}
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-md border border-gray-200 bg-gray-0 shadow-sm"
        >
          {showLoading ? (
            <div aria-live="polite">
              <span className="sr-only">{copy.loading}</span>
              {Array.from({ length: 3 }, (_, index) => (
                <SuggestionSkeleton key={index} />
              ))}
            </div>
          ) : suggestionsQuery.isError ? (
            <div className="px-4 py-4 text-center" role="alert">
              <p className="type-body-sm text-gray-600">{copy.error}</p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => void suggestionsQuery.refetch()}
              >
                {copy.retry}
              </Button>
            </div>
          ) : products.length === 0 ? (
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
                tabIndex={-1}
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => navigateToProduct(product)}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 border-b border-gray-100 px-3 py-2 text-start last:border-b-0 hover:bg-gray-50 focus-visible:bg-gold-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  index === activeIndex &&
                    "bg-gold-50 outline outline-1 outline-inset outline-gold-500",
                )}
              >
                <AppImage
                  alt={product.name}
                  aspectRatio="1 / 1"
                  frameClassName="size-12 shrink-0 rounded-md"
                  sizes="48px"
                  src={product.imageUrl}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-body font-medium text-gray-1000">
                    {product.name}
                  </span>
                  <bdi className="mt-1 block type-ui-sm text-gray-700">
                    {priceFormatter.format(product.price)}
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
