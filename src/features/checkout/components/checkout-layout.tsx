import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CheckoutLayoutProps = {
  title: ReactNode;
  workflow: ReactNode;
  summary: ReactNode;
  className?: string;
};

export function CheckoutLayout({
  className,
  summary,
  title,
  workflow,
}: CheckoutLayoutProps) {
  return (
    <div className={cn("py-8 sm:py-10", className)}>
      <h1 className="text-h1 font-bold text-gray-1000">{title}</h1>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start rtl:lg:flex-row-reverse">
        <div className="min-w-0 flex-1">{workflow}</div>
        <div className="w-full lg:w-[22rem] lg:shrink-0">{summary}</div>
      </div>
    </div>
  );
}

export type { CheckoutLayoutProps };