import { NativeSelect } from "@/components/ui/native-select";

type ListingSortProps<TSort extends string> = {
  label: string;
  options: Record<TSort, string>;
  sort: TSort;
  onChange: (sort: TSort) => void;
};

export function ListingSortControl<TSort extends string>({
  label,
  onChange,
  options,
  sort,
}: ListingSortProps<TSort>) {
  return (
    <label className="inline-flex min-w-0 max-w-full items-center gap-2 type-body">
      <span className="shrink-0">{label}</span>
      <NativeSelect
        value={sort}
        onChange={(event) => onChange(event.target.value as TSort)}
      >
        {(Object.keys(options) as TSort[]).map((value) => (
          <option key={value} value={value}>
            {options[value]}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
