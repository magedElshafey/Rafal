import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CheckoutStepSectionProps = {
  id: string;
  step: ReactNode;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function CheckoutStepSection({
  children,
  className,
  footer,
  id,
  step,
  title,
}: CheckoutStepSectionProps) {
  const titleId = `${id}-title`;

  return (
    <section
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
      <div className="mt-5 space-y-3">{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}

export type { CheckoutStepSectionProps };