import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type InfoNoticeProps = ComponentPropsWithoutRef<"aside"> & {
  description: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
};

export function InfoNotice({
  className,
  description,
  icon,
  title,
  ...props
}: InfoNoticeProps) {
  return (
    <aside
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:items-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-0 text-gray-700"
        >
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="type-body-sm font-medium text-gray-1000">{title}</p>
        <p className="mt-1 type-body-sm text-gray-600">{description}</p>
      </div>
    </aside>
  );
}
