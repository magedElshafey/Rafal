import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type SkeletonProps = ComponentPropsWithoutRef<"div">;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-gray-100 motion-reduce:animate-none",
        className,
      )}
    />
  );
}
