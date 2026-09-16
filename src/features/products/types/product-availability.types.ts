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
    };

export type VariantAvailabilityById = Readonly<
  Record<string, ResolvedVariantAvailability>
>;
