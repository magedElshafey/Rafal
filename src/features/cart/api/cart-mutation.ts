export const cartMutationKey = ["cart", "mutation"] as const;

export const cartMutationScope = { id: "cart" } as const;

export const cartMutationFilters = {
  mutationKey: cartMutationKey,
  exact: true,
} as const;
