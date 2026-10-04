export type VariantAttributeKey = string;
export type VariantAttributeValue = string;
export type VariantAttributes = Readonly<
  Record<VariantAttributeKey, VariantAttributeValue>
>;
export type VariantAttributeEntry = readonly [
  key: VariantAttributeKey,
  value: VariantAttributeValue,
];

const DANGEROUS_ATTRIBUTE_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const UNKNOWN_COLOR_FALLBACK = "#D4D4D4" as const;
const reportedUnknownColorValues = new Set<string>();

// Temporary legacy color compatibility. Remove after persisted color values are
// migrated to canonical #RRGGBB.
const LEGACY_COLOR_SWATCHES: Readonly<Record<string, `#${string}`>> = {
  red: "#FF0000",
  blue: "#0000FF",
  pink: "#FFC0CB",
  silver: "#C0C0C0",
  gold: "#FFD700",
  black: "#000000",
};

export type VariantColorSwatch = Readonly<
  | { kind: "canonical"; cssColor: `#${string}` }
  | { kind: "legacy"; cssColor: `#${string}` }
  | { kind: "fallback"; cssColor: typeof UNKNOWN_COLOR_FALLBACK }
>;

export class VariantAttributesContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Invalid Variant attributes at "${path}": expected ${expected}.`);
    this.name = "VariantAttributesContractError";
  }
}

function emptyVariantAttributes(): VariantAttributes {
  return Object.freeze({});
}

/**
 * Storefront Variant attributes are dynamic flat string maps. Read-time
 * parsing preserves persisted keys exactly; Variant ID is commerce identity;
 * Dashboard key normalization is a write-side concern.
 */
export function parseVariantAttributes(
  value: unknown,
  path = "variant.attributes",
): VariantAttributes {
  if (value === null || value === undefined) return emptyVariantAttributes();
  if (Array.isArray(value)) {
    if (value.length === 0) return emptyVariantAttributes();
    throw new VariantAttributesContractError(
      path,
      "an empty legacy array or a flat string map",
    );
  }
  if (typeof value !== "object") {
    throw new VariantAttributesContractError(path, "a flat string map");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new VariantAttributesContractError(path, "a plain object");
  }

  const entries = Object.entries(value);
  for (const [key, attributeValue] of entries) {
    if (key.trim() === "") {
      throw new VariantAttributesContractError(path, "non-empty attribute keys");
    }
    if (DANGEROUS_ATTRIBUTE_KEYS.has(key)) {
      throw new VariantAttributesContractError(
        `${path}.${key}`,
        "a safe attribute key",
      );
    }
    if (typeof attributeValue !== "string") {
      throw new VariantAttributesContractError(
        `${path}.${key}`,
        "a string value",
      );
    }
  }

  return Object.freeze(Object.fromEntries(entries));
}

export function getVariantAttributeEntries(
  attributes: VariantAttributes,
): readonly VariantAttributeEntry[] {
  return Object.entries(attributes);
}

export function humanizeVariantAttributeKey(key: string): string {
  return key.trim().replace(/[_-]+/g, " ");
}

export function getVariantAttributeLabel(
  key: string,
  knownLabels: Readonly<Partial<Record<"color" | "size", string>>> = {},
): string {
  if (key === "color" && knownLabels.color) return knownLabels.color;
  if (key === "size" && knownLabels.size) return knownLabels.size;
  return humanizeVariantAttributeKey(key);
}

export function resolveVariantColorSwatch(value: string): VariantColorSwatch {
  if (HEX_COLOR_PATTERN.test(value)) {
    return {
      kind: "canonical",
      cssColor: value.toUpperCase() as `#${string}`,
    };
  }

  const legacyColor = LEGACY_COLOR_SWATCHES[value.trim().toLowerCase()];
  if (legacyColor) return { kind: "legacy", cssColor: legacyColor };

  if (
    process.env.NODE_ENV !== "production" &&
    !reportedUnknownColorValues.has(value)
  ) {
    reportedUnknownColorValues.add(value);
    console.error("[variants:color-presentation] using neutral fallback swatch", {
      value,
    });
  }

  return { kind: "fallback", cssColor: UNKNOWN_COLOR_FALLBACK };
}
