import { useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import type {
  ListingSubcategoryOption,
  ProductListingFilters,
} from "@/features/products/types/product-listing.types";
import { isListingPriceRangeValid } from "@/features/products/utils/listing-price-range";
import { cn } from "@/lib/utils";

export type ListingFiltersCopy = {
  additional: string;
  all: string;
  available: string;
  maxPrice: string;
  minPrice: string;
  invalidPriceRange: string;
  personalizable: string;
  priceRange: string;
  subcategories: string;
};

type ListingFiltersProps = {
  copy: ListingFiltersCopy;
  filters: ProductListingFilters;
  onChange: (updates: Partial<ProductListingFilters>) => void;
  subcategoryOptions: readonly ListingSubcategoryOption[];
  total: number;
};

export function ListingFilters({
  copy,
  filters,
  onChange,
  subcategoryOptions,
  total,
}: ListingFiltersProps) {
  const priceRangeErrorId = useId();
  const priceRangeIsValid = isListingPriceRangeValid(filters);

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-h4 font-medium">{copy.subcategories}</legend>
        <div className="mt-3 space-y-2 type-body">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              className="accent-gold-500"
              type="radio"
              name="subcategory"
              checked={!filters.subcategory}
              onChange={() => onChange({ subcategory: undefined })}
            />
            <span>
              {copy.all} ({total})
            </span>
          </label>
          {subcategoryOptions.map(({ value, label, count }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2"
            >
              <input
                className="accent-gold-500"
                type="radio"
                name="subcategory"
                checked={filters.subcategory === value}
                onChange={() => onChange({ subcategory: value })}
              />
              <span>
                {label} ({count})
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="border-t border-border pt-6">
        <legend className="text-h4 font-medium">{copy.priceRange}</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            key={`min-${filters.minPrice ?? ""}`}
            aria-label={copy.minPrice}
            aria-describedby={
              priceRangeIsValid ? undefined : priceRangeErrorId
            }
            aria-invalid={priceRangeIsValid ? undefined : true}
            className={cn(
              "h-11 min-w-0 rounded-md border border-border px-3 type-body outline-none focus:border-gold-500",
              !priceRangeIsValid && "border-destructive",
            )}
            inputMode="decimal"
            placeholder={copy.minPrice}
            type="number"
            min="0"
            defaultValue={filters.minPrice ?? ""}
            onBlur={(event) =>
              onChange({
                minPrice:
                  event.target.value === ""
                    ? undefined
                    : Number(event.target.value),
              })
            }
          />
          <input
            key={`max-${filters.maxPrice ?? ""}`}
            aria-label={copy.maxPrice}
            aria-describedby={
              priceRangeIsValid ? undefined : priceRangeErrorId
            }
            aria-invalid={priceRangeIsValid ? undefined : true}
            className={cn(
              "h-11 min-w-0 rounded-md border border-border px-3 type-body outline-none focus:border-gold-500",
              !priceRangeIsValid && "border-destructive",
            )}
            inputMode="decimal"
            placeholder={copy.maxPrice}
            type="number"
            min="0"
            defaultValue={filters.maxPrice ?? ""}
            onBlur={(event) =>
              onChange({
                maxPrice:
                  event.target.value === ""
                    ? undefined
                    : Number(event.target.value),
              })
            }
          />
        </div>
        {!priceRangeIsValid ? (
          <p
            id={priceRangeErrorId}
            className="mt-2 type-body-sm text-destructive"
            role="alert"
          >
            {copy.invalidPriceRange}
          </p>
        ) : null}
      </fieldset>
      <fieldset className="border-t border-border pt-6">
        <legend className="text-h4 font-medium">{copy.additional}</legend>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 type-body">
            <Checkbox
              checked={filters.inStock}
              onCheckedChange={(checked) =>
                onChange({ inStock: checked === true })
              }
            />
            {copy.available}
          </label>
          <label className="flex cursor-pointer items-center gap-3 type-body">
            <Checkbox
              checked={filters.personalizable}
              onCheckedChange={(checked) =>
                onChange({ personalizable: checked === true })
              }
            />
            {copy.personalizable}
          </label>
        </div>
      </fieldset>
    </div>
  );
}
