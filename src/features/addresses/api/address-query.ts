import { infiniteQueryOptions } from "@tanstack/react-query";
import type { Locale } from "next-intl";

import type { AddressPage } from "@/features/addresses/types/address.types";

type AddressListRequestErrorCode = "unauthorized" | "service-unavailable";

export class AddressListRequestError extends Error {
  constructor(
    readonly code: AddressListRequestErrorCode,
    readonly status: number,
  ) {
    super(`Address list request failed: ${code}.`);
    this.name = "AddressListRequestError";
  }
}

export function addressListQueryKey(locale: Locale) {
  return ["account", "addresses", locale] as const;
}

async function fetchAddressPage({
  locale,
  page,
  signal,
}: {
  locale: Locale;
  page: number;
  signal?: AbortSignal;
}): Promise<AddressPage> {
  const searchParams = new URLSearchParams({ locale, page: String(page) });
  const response = await fetch(`/api/account/addresses?${searchParams}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new AddressListRequestError(
      response.status === 401 ? "unauthorized" : "service-unavailable",
      response.status,
    );
  }
  return response.json() as Promise<AddressPage>;
}

export function addressInfiniteQueryOptions(locale: Locale) {
  return infiniteQueryOptions({
    queryKey: addressListQueryKey(locale),
    queryFn: ({ pageParam, signal }) =>
      fetchAddressPage({ locale, page: pageParam, signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.currentPage < lastPage.pagination.lastPage
        ? lastPage.pagination.currentPage + 1
        : undefined,
    retry: false,
    staleTime: 45_000,
  });
}
