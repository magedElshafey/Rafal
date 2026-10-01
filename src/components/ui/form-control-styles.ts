// Shared native-control states. Keep border width fixed through focus/error.
export const formControlStyles = [
  "w-full min-w-0 rounded-md border border-gray-200 bg-gray-0 px-3.5 type-body text-gray-1000 outline-none placeholder:text-gray-400",
  "[&:not(:disabled):not([readonly]):not([aria-invalid=true]):not(:focus)]:hover:border-gray-300",
  "focus:border-gold-500 focus:ring-2 focus:ring-ring focus:ring-offset-2",
  "aria-invalid:border-destructive aria-invalid:focus:border-destructive",
  "[&[readonly]:not(:disabled)]:bg-gray-50",
  "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400",
  "forced-colors:focus:outline-solid forced-colors:focus:outline-2 forced-colors:focus:outline-offset-2 forced-colors:focus:outline-[Highlight]",
].join(" ");
