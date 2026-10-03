import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CheckoutStepSectionProps = {
  children: ReactNode;
  className?: string;
  id: string;
  step: string;
  title: string;
};

export function CheckoutStepSection({
  children,
  className,
  id,
  step,
  title,
}: CheckoutStepSectionProps) {
  const titleId = `${id}-title`;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "rounded-lg border border-gray-200 bg-gray-0 p-4 sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-900 type-body-sm font-medium text-gray-0"
        >
          {step}
        </span>
        <h2 id={titleId} className="text-h3 font-bold text-gray-1000">
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
