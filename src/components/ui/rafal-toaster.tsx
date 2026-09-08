"use client";

import { Toaster } from "sonner";

type RafalToasterProps = {
  direction: "rtl" | "ltr";
};

export function RafalToaster({ direction }: RafalToasterProps) {
  return (
    <Toaster
      dir={direction}
      position="bottom-center"
      visibleToasts={3}
      gap={8}
      offset="calc(1rem + env(safe-area-inset-bottom))"
      mobileOffset="calc(1rem + env(safe-area-inset-bottom))"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex min-h-10 w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md bg-gray-1000 px-4 py-2 type-body-sm text-gray-0 shadow-[var(--shadow-toast)]",
          content: "min-w-0",
          title: "break-words",
          icon: "m-0 shrink-0",
        },
      }}
    />
  );
}
