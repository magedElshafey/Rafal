import type { ListingSort } from "@/features/products/types/product-listing.types";

type ListingSortProps = {
  label: string;
  options: Record<ListingSort, string>;
  sort: ListingSort;
  onChange: (sort: ListingSort) => void;
};

export function ListingSortControl({
  label,
  onChange,
  options,
  sort,
}: ListingSortProps) {
  return (
    <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 type-body">
      <span>{label}</span>
      <select
        className="h-10 bg-transparent outline-none"
        value={sort}
        onChange={(event) => onChange(event.target.value as ListingSort)}
      >
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
