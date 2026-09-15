import {
  offerValues,
  type OfferType,
} from "@/features/offers/types/offers.types";

export const defaultOfferType: OfferType = "all";

export function parseOfferType(searchParams: URLSearchParams): OfferType {
  const rawOffer = searchParams.get("offer");
  return offerValues.find((value) => value === rawOffer) ?? defaultOfferType;
}

export function updateOfferSearchParams(
  current: URLSearchParams,
  offer: OfferType,
): URLSearchParams {
  const next = new URLSearchParams(current);

  if (offer === defaultOfferType) next.delete("offer");
  else next.set("offer", offer);

  return next;
}
