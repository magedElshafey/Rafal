import { forwardRef, type InputHTMLAttributes } from "react";

import { SearchIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type SearchBoxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> & {
  id: string;
  label: string;
  clearLabel?: string;
  onClear?: () => void;
};

const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(
  ({ className, clearLabel, id, label, onClear, value, ...props }, ref) => (
    <search
      className={cn(
        "flex h-[var(--header-search-height)] w-full items-center gap-[var(--header-search-gap)] rounded-full bg-gray-100 px-4",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <SearchIcon size={20} className="shrink-0 text-gray-1000" />
      <input
        ref={ref}
        id={id}
        type="search"
        value={value}
        className="min-w-0 flex-1 bg-transparent type-ui-sm leading-none text-gray-1000 outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {onClear && value ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={onClear}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon size={16} />
        </button>
      ) : null}
    </search>
  ),
);

SearchBox.displayName = "SearchBox";

export { SearchBox };
export type { SearchBoxProps };
