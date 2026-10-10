import type { VariantAttributes } from "@/lib/variant-attributes";

type VariantWithIdentity = {
  id: string;
  attributes: VariantAttributes;
};

export type AmbiguousVariantCombination = {
  attributes: readonly (readonly [string, string])[];
  variantIds: readonly string[];
};

function orderedEntries(attributes: VariantAttributes) {
  return Object.entries(attributes).sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function combinationKey(attributes: VariantAttributes) {
  return JSON.stringify(orderedEntries(attributes));
}

export function findAmbiguousVariantCombinations(
  variants: readonly VariantWithIdentity[],
): readonly AmbiguousVariantCombination[] {
  const groups = new Map<string, VariantWithIdentity[]>();
  for (const variant of variants) {
    const key = combinationKey(variant.attributes);
    const group = groups.get(key);
    if (group) group.push(variant);
    else groups.set(key, [variant]);
  }

  return Array.from(groups.values())
    .filter((group) => group.length > 1)
    .map((group) => ({
      attributes: orderedEntries(group[0]!.attributes),
      variantIds: group.map((variant) => variant.id),
    }));
}

export function resolveUniqueVariantByAttributes<
  TVariant extends { attributes: VariantAttributes },
>(
  variants: readonly TVariant[],
  selectedOptions: Readonly<Record<string, string>>,
): TVariant | null {
  const selectedCombinationKey = combinationKey(selectedOptions);
  const matches = variants.filter(
    (variant) => combinationKey(variant.attributes) === selectedCombinationKey,
  );

  return matches.length === 1 ? matches[0]! : null;
}
