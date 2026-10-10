import type { Locale } from "next-intl";

import type {
  QuickAddSelectionErrorCode,
  QuickAddSelectionResponse,
} from "@/features/products/types/quick-add-selection.types";
import { quickAddSelectionQueryKey } from "@/features/products/utils/quick-add-selection";
import { ApiError } from "@/lib/api/api-error";

export async function getQuickAddSelection({
  cityId,
  locale,
  signal,
  slug,
}: {
  cityId: number;
  locale: Locale;
  signal?: AbortSignal;
  slug: string;
}): Promise<QuickAddSelectionResponse> {
  const params = new URLSearchParams({ cityId: String(cityId), slug });
  const response = await fetch(`/api/products/quick-add?${params}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Accept-Language": locale },
    signal,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      code?: QuickAddSelectionErrorCode;
    } | null;
    throw new ApiError({
      code: payload?.code ?? "service-unavailable",
      message: "Quick Add selection could not be loaded.",
      status: response.status,
    });
  }
  return response.json() as Promise<QuickAddSelectionResponse>;
}

export function quickAddSelectionQueryOptions(
  locale: Locale,
  slug: string,
  cityId: number,
) {
  return {
    queryKey: quickAddSelectionQueryKey(locale, slug, cityId),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      getQuickAddSelection({ cityId, locale, signal, slug }),
    retry: false,
    staleTime: 0,
  } as const;
}
