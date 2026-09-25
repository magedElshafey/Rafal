import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = ComponentPropsWithoutRef<"div"> & {
  description?: ReactNode;
  title: ReactNode;
};

export function EmptyState({
  className,
  description,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-6 text-center",
        className,
      )}
      {...props}
    >
      <p className="text-h4 font-medium text-gray-1000">{title}</p>
      {description ? (
        <p className="mt-2 max-w-xl type-body text-gray-600">{description}</p>
      ) : null}
    </div>
  );
}
