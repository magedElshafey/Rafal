"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

type HomeHeroRetryProps = {
  label: string;
  pendingLabel: string;
};

export function HomeHeroRetry({ label, pendingLabel }: HomeHeroRetryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      loading={isPending}
      loadingLabel={pendingLabel}
      onClick={() => startTransition(() => router.refresh())}
      variant="outline"
    >
      {label}
    </Button>
  );
}
