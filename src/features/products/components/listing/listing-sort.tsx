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
    <label className="inline-flex items-center gap-2 rounded-md border border-border px-3 type-body">
      <span>{label}</span>
      <select
        className="h-10 bg-transparent outline-none"
        value={sort}
        onChange={(event) => onChange(event.target.value as TSort)}
      >
        {(Object.keys(options) as TSort[]).map((value) => (
          <option key={value} value={value}>
            {options[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
