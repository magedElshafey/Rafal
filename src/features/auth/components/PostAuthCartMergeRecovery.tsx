"use client";

import type { Locale } from "next-intl";

import { Button } from "@/components/ui/button";
import { usePostAuthCartMerge } from "@/features/auth/hooks/use-post-auth-cart-merge";

type PostAuthCartMergeRecoveryProps = {
  copy: { error: string; retry: string; retrying: string };
  locale: Locale;
  returnTo: string;
};

export function PostAuthCartMergeRecovery({
  copy,
  locale,
  returnTo,
}: PostAuthCartMergeRecoveryProps) {
  const { retryMerge, retryPending } = usePostAuthCartMerge(locale, returnTo);

  return (
    <div className="flex flex-col gap-5" role="alert">
      <p className="rounded-md bg-gold-50 p-3 type-body-sm text-gray-700">
        {copy.error}
      </p>
      <Button
        type="button"
        size="lg"
        className="w-full"
        loading={retryPending}
        loadingLabel={copy.retrying}
        onClick={retryMerge}
      >
        {copy.retry}
      </Button>
    </div>
  );
}
