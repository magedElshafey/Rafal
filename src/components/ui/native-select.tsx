import { forwardRef, type SelectHTMLAttributes } from "react";

import { formControlStyles } from "@/components/ui/form-control-styles";
import { ChevronDownIcon } from "@/components/ui/icons/interface-icons";
import { cn } from "@/lib/utils";

export interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, dir, invalid, multiple, size, ...props }, ref) => {
    const listbox = multiple || (size !== undefined && size > 1);

    return (
      <span dir={dir} className="relative block min-w-0">
        <select
          ref={ref}
          dir={dir}
          multiple={multiple}
          size={size}
          aria-invalid={invalid || undefined}
          className={cn(
            formControlStyles,
            "peer appearance-none text-start",
            listbox ? "h-auto py-3" : "h-11 pe-10",
            className,
          )}
          {...props}
        />
        {!listbox ? (
          <ChevronDownIcon
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-gray-600 peer-disabled:text-gray-400"
          />
        ) : null}
      </span>
    );
  },
);

NativeSelect.displayName = "NativeSelect";
