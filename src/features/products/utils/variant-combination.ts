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
    groups.set(key, [...(groups.get(key) ?? []), variant]);
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
  const selectedEntries = Object.entries(selectedOptions);
  const matches = variants.filter((variant) => {
    const attributes = Object.entries(variant.attributes);
    return (
      attributes.length === selectedEntries.length &&
      attributes.every(([key, value]) => selectedOptions[key] === value)
    );
  });

  return matches.length === 1 ? matches[0]! : null;
}
