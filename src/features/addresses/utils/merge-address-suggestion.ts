import type { AddressMapFields, AddressMapSuggestion } from "@/features/addresses/types/address-map.types";

const fields = ["district", "streetDetails"] as const;

// One guard per form draft. A deliberate clear is a manual edit too.
export function createAddressSuggestionGuard(initial: AddressMapFields) {
  const protectedFields = new Set<string>(fields.filter(field => initial[field].length > 0));
  const lastApplied: Partial<AddressMapFields> = {};
  return {
    manual(field: string) { if (fields.some(item => item === field)) protectedFields.add(field); },
    merge(current: AddressMapFields, suggestion: AddressMapSuggestion, replace = false): Partial<AddressMapFields> {
      const patch: Partial<AddressMapFields> = {};
      for (const field of fields) {
        const value = suggestion[field];
        if (!value) continue;
        const eligible = !protectedFields.has(field) && (current[field] === "" || current[field] === lastApplied[field]);
        if (replace || eligible) {
          patch[field] = value;
          lastApplied[field] = value;
          if (replace) protectedFields.delete(field);
        }
      }
      return patch;
    },
  };
}
