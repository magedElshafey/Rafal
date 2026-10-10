# Quick Add

Product listing payloads expose only a minimal `quickAdd` journey descriptor:

- `direct` preserves the exact variant ID when a non-personalizable product has one valid variant.
- `select-options` identifies a non-personalizable product with multiple valid variants. In Phase 5A this action routes to the PDP and never selects or adds a variant; Phase 5B owns current-city option availability and selection.
- `customize` routes personalizable products to the PDP, where personalization remains owned.

Listing metadata decides the journey, not final availability. The Laravel Add Cart contract remains authoritative for a direct Add, including location, inventory, and quantity limits. The listing projection does not expose full variants, options, warehouse stock, product details, or personalization configuration.
