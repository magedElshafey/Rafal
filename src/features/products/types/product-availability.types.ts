export type ResolvedVariantAvailability =
  | {
      status: "available";
      maxOrderQuantity: number;
    }
  | {
      status: "out_of_stock";
    }
  | {
      status: "unavailable_at_location";
    }
  | {
      /** Purchase is blocked because stock context or the Cart contract is unresolved. */
      status: "purchase_unavailable";
    };

export type VariantAvailabilityById = Readonly<
  Record<string, ResolvedVariantAvailability>
>;
