# Quick Add

Product listing payloads expose only a minimal `quickAdd` journey descriptor:

- `direct` preserves the exact variant ID when a non-personalizable product has one valid variant.
- `select-options` identifies a non-personalizable product with multiple valid variants. User intent opens a compact selector that reads current-city configuration and availability on demand. With no committed Browsing City, the action falls back to the PDP.
- `customize` routes personalizable products to the PDP, where personalization remains owned.

Listing metadata decides the journey, not final availability. The selector server read revalidates the current journey before exposing option data. The durable Browsing City cookie is authoritative for both selector availability and Add; the expected city request field only detects client/server races. A gift recipient remains a Cart fulfillment concern and never changes Quick Add selection context.

The server projects only option structure, mapped pricing, and resolved availability. Raw warehouse quantities and raw `ProductDetails` never cross the browser boundary. The Laravel Add Cart contract remains the final authority for location, inventory, and quantity limits. The listing projection continues to exclude full variants, options, warehouse stock, product details, availability maps, and personalization configuration.

Variant parsing validates transport shape and types only. Semantic product configuration validation separately requires every complete attribute combination to identify exactly one variant. Duplicate combinations are order-independent contract failures: resolution fails closed and never chooses an arbitrary variant. The server retains the product and duplicate-variant diagnostic in a typed `ProductConfigurationError`; Quick Add converts it to the safe `product-configuration-invalid` browser code without exposing IDs or internal detail.

The selector mounts stable summary and quantity-helper regions, keeps chip geometry unchanged between selected and unselected states, and uses a non-color check indicator. Its loading surface reserves a reasonable minimum height, while genuine errors may expand the sheet. These measures reduce normal option-selection movement without claiming to eliminate every content-driven size change.

Opening the selector is fresh user intent: both its selection query and the canonical current-Cart query confirm fresh server state on mount. Availability failures refresh only the exact selector query. A quantity-limit rejection refreshes both that selector query and the exact canonical Cart query while leaving the rejection visible.

While the selector is open, its originating Quick Add button remains natively focusable for reliable focus restoration. If a city transition starts, the opener uses `aria-disabled` styling and the existing activation guard blocks work; outside the open-selector lifecycle, blocked triggers use native `disabled` as usual.
