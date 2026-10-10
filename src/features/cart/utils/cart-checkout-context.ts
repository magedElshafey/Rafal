import type { CityTransitionStatus } from "@/features/location/city-transition-state";

export type CartCheckoutContext = Readonly<{
  browsingCityId: number | null;
  cityTransitionLocked: boolean;
  cityTransitionStatus: CityTransitionStatus;
  fulfillmentCityId: number | null;
}>;

export type CartCheckoutContextSnapshot = CartCheckoutContext &
  Readonly<{ revision: number }>;

export function createCartCheckoutContextSnapshot(
  context: CartCheckoutContext,
): CartCheckoutContextSnapshot {
  return { ...context, revision: 0 };
}

export function updateCartCheckoutContextSnapshot(
  current: CartCheckoutContextSnapshot,
  next: CartCheckoutContext,
): CartCheckoutContextSnapshot {
  if (
    current.browsingCityId === next.browsingCityId &&
    current.cityTransitionLocked === next.cityTransitionLocked &&
    current.cityTransitionStatus === next.cityTransitionStatus &&
    current.fulfillmentCityId === next.fulfillmentCityId
  ) {
    return current;
  }

  return { ...next, revision: current.revision + 1 };
}

export function canContinueCartCheckout(
  started: CartCheckoutContextSnapshot,
  current: CartCheckoutContextSnapshot,
): boolean {
  return (
    !current.cityTransitionLocked &&
    current.revision === started.revision &&
    current.browsingCityId === started.browsingCityId &&
    current.fulfillmentCityId === started.fulfillmentCityId
  );
}
