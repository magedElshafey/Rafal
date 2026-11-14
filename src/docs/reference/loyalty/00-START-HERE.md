# START HERE — Scope, implementation boundaries and proven decisions

## Mission
Build Loyalty into the **separate Next.js Storefront**: Account Points, Checkout Redemption, Order Details loyalty breakdown, Notifications. Reuse current app architecture / components / API client / auth / localization rather than creating a parallel system. Dashboard is a separate repo and feature; dashboard-specific RBAC/permission systems are out of scope.

## Explicit current implementation boundaries
- The complete user-supplied stories are in `01-user-stories-source.md`; exact supplied ACs must be considered, including backend-owned logic (not all backend acceptance criteria turn into frontend tasks).
- Storefront only handles displaying the backend truth, sending `use_points: 0|1`, re-quoting when relevant checkout inputs change, handling loading/empty/errors, and accurate accessible responsive UI.
- Backend owns money, point calculation, tax, concurrency, holds, maturation, refunds, expiry, guest claiming, notifications delivery. Do not replicate as business logic or create client permission guard systems.
- Loyalty points applied are **payment tender, NOT coupon/discount**. Do not recompute VAT or change original gross `money.total` when showing `loyalty.amount_due`.
- Do not infer earned status from order status: `earned_status: null` before confirmation; `pending` at confirmed, processing, shipped, delivered; `cancelled` after full return in tested lifecycle. Only show pending availability date when relevant, even if stale `available_on` persists after return.
- `GET /loyalty.available` may be 100 while `POST /checkout/quote` says `usable:0, disabled_reason:'pending_order'`. Checkout must trust quote `usable`/`disabled_reason`, not account available alone.
- `POST /checkout/quote` and `/checkout/place` both accept `use_points` numeric `0`/`1` as confirmed. One 409 occurred with message `تم تحديث قيمة النقاط، يرجى مراجعة الطلب`; no automatic retry of place. Backend returns `errors.totals` for review; confirm updated quote before resubmitting.
- Order details route/request uses **order_number**, e.g. `RF-10147`, not numeric 147 (exact URL path to discover in app).
- No active access to Figma; design assets are standalone desktop screenshots. They are NOT evidence of mobile designs or comprehensive responsive tokens.
- DO NOT treat any example order/customer/product/currency constants as live defaults.

## Must preserve
- Existing Next.js routing, state ownership, shared layout, query/fetch patterns, i18n RTL/LTR, API error conventions, checkout payment flow, tests.
- No new broad runtime parsing framework, schema library, generic adapters or duplicate data-fetch pipelines. Narrow types and targeted normalization only where actual contract warrants it.
- Minimize API requests, redundant re-renders, dependency bloat, client bundle and cumulative layout shift.

## Cart badge microtask
Implement a small **real cart item count** badge on the shared header cart icon(s). Reuse existing cart state/source and icons; avoid extra requests; determine whether existing cart count means summed quantities or unique lines and document the UX decision. Ensure account/guest flow consistency, initial hydration stability, responsive placement, aria-label semantics, RTL/LTR and zero-count behavior. No new global cart store if an existing source already exists. Isolate task from Loyalty rollout.
