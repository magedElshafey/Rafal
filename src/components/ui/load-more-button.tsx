"use client";

import { Button } from "@/components/ui/button";

type LoadMoreButtonProps = {
  disabled?: boolean;
  hasNextPage: boolean;
  isLoading: boolean;
  label: string;
  loadingLabel?: string;
  onClick: () => void;
};

export function LoadMoreButton({
  disabled = false,
  hasNextPage,
  isLoading,
  label,
  loadingLabel,
  onClick,
}: LoadMoreButtonProps) {
  if (!hasNextPage) return null;

  return (
    <Button
      disabled={disabled || isLoading}
      loading={isLoading}
      loadingLabel={loadingLabel}
      onClick={onClick}
      variant="outline"
    >
      {label}
    </Button>
  );
}
