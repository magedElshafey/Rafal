import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ErrorStateProps = ComponentPropsWithoutRef<"div"> & {
  action?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
};

export function ErrorState({
  action,
  className,
  description,
  icon,
  title,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-6 text-center",
        className,
      )}
      {...props}
    >
      {icon ? <div aria-hidden="true">{icon}</div> : null}
      <p className="text-h4 font-medium text-gray-1000">{title}</p>
      {description ? (
        <p className="mt-2 max-w-xl type-body text-gray-600">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
