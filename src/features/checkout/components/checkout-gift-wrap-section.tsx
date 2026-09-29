import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CheckoutGiftWrapSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  price?: ReactNode;
  control?: ReactNode;
  messageField?: ReactNode;
  className?: string;
};

export function CheckoutGiftWrapSection({
  className,
  control,
  description,
  messageField,
  price,
  title,
}: CheckoutGiftWrapSectionProps) {
  return (
    <section
      className={cn(
        "rounded-md border border-gray-200 bg-gray-50 px-4 py-4 sm:px-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {control ? <span className="shrink-0">{control}</span> : null}
        <div className="min-w-0 flex-1">
          <h2 className="type-body font-medium text-gray-1000">{title}</h2>
          {description ? (
            <p className="mt-1 type-body-sm text-gray-500">{description}</p>
          ) : null}
        </div>
        {price ? (
          <span className="shrink-0 type-body font-medium text-gray-1000">
            {price}
          </span>
        ) : null}
      </div>
      {messageField ? <div className="mt-4">{messageField}</div> : null}
    </section>
  );
}

export type { CheckoutGiftWrapSectionProps };