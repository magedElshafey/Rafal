# Storefront Loyalty architecture audit

Date: 2026-11-14. Scope: focused discovery and planning; only the shared Cart badge is implemented. No Dashboard access, Loyalty implementation, dependency, commit or push.

## Evidence and limits

- Current request overrides the historical Phase 2 restriction for planning only. Product/API evidence: [start here](../../../src/docs/reference/loyalty/00-START-HERE.md), [stories](../../../src/docs/reference/loyalty/01-user-stories-source.md), [verified contracts](../../../src/docs/reference/loyalty/03-verified-api-contracts.md), [lifecycle](../../../src/docs/reference/loyalty/04-lifecycle-evidence.md), [design map](../../../src/docs/reference/loyalty/05-design-map-and-quality-bar.md), [gaps](../../../src/docs/reference/loyalty/06-gaps-and-acceptance-checklist.md). Paths in this checkout are under `src/docs` and `src/design`; original user files remain untouched and untracked.
- All eight original PNGs were visually opened. No Figma access or mobile designs, live API requests, or pixel-perfect implementation claim. Postman evidence is user-confirmed; selected-field fixtures are not full endpoint responses.
- `docs/ARCHITECTURE.md` contains historical Cart paragraphs saying authenticated Cart, merge and Checkout are deferred. Actual `cart-auth-context.ts`, `use-post-auth-cart-merge.ts`, and Checkout implement these. Preserve current behavior per this task; reconcile the stale documentation separately. Phone OTP is the current documented/auth implementation, despite the older email wording in AGENTS.

## Current boundaries and reuse

Paths below are relative to repository root.

| Area | Observed implementation | Consequence for Loyalty |
| --- | --- | --- |
| Framework/shell | Next 16.3.3, React 19; `src/app/[locale]/layout.tsx` supplies Tajawal, document direction, NextIntlClientProvider and QueryProvider. `(storefront)/layout.tsx` resolves profile/location and composes server Header/Footer, categories, mobile navigation and BrowsingCityProvider. `(auth)` is separate. | Keep pages/server shell intact; no new provider or global Loyalty store. |
| Account | `(storefront)/account/layout.tsx` requires user and composes `AccountSidebar`, `AccountUserSummary`, `AccountNavigation`. Desktop sidebar is 17.5rem at lg; native details navigation below lg. | Reuse account route/sidebar and localized navigation. No duplicated account layout. |
| Existing Loyalty | `features/loyalty/server/loyalty-boundary.ts` imports `mock-loyalty-data.ts`, returns fabricated zero/empty when customer absent. Types only have balance and earned/redeemed transactions. Existing page has green balance card, static How It Works, basic history without API pagination. `ProfileLoyaltySummary` exists but profile integration is commented out. | Replace the feature boundary with verified API reads; do not append a second implementation or silently present request failure as zero. Profile summary activation is not required by this task. |
| Cart | `cart-query.ts` owns canonical `['cart','current',locale,null]` and city projections; mutations write via `setCurrentCartQueryData`. `use-cart-page-mutations.ts` overlays optimistic quantity/remove intent with rollback, not optimistic money. `useCurrentCart` combines canonical and fulfillment projection, including gift city. | Badge needs canonical quantity only, never warehouse checks or a separate counter store. |
| Cart identity | `cart-auth-context.ts` selects server-resolved Bearer or HttpOnly guest token; `cart-boundary.ts` calls Laravel. First successful guest mutation persists token; clear removes it. Login merge writes returned canonical Cart or invalidates existing keys. | Same badge for guests/authenticated customers. Reuse existing session lifecycle, never read cookies/tokens in the badge. |
| Checkout | Server route supplies initial context and payment discovery; `checkout-page.tsx` owns committed destination/shipping/gift/payment state. `use-checkout-quote.ts` uses request-keyed Query with AbortSignal, 30s stale time, retry false; usable quote excludes pending/fetching/error. Gift changes explicitly re-quote. | Add numeric points intent to existing request/key/serializers; audit every invalidation call so old ON/OFF quotes cannot authorize Place. |
| Checkout transport | Browser JSON to private `/api/checkout/quote` and `/place`; server parses input, resolves identity, calls feature API through `serverApi`. Upstream is FormData, with bracketed address fields. Place allowlist currently rejects new fields. | Extend both browser parsers and FormData serializers. `use_points` is 0/1 intent and string `"0"`/`"1"` on multipart wire. Do not switch transport to JSON based on a sample. |
| Payment safety | Place retry false; synchronous in-flight and attempt refs prevent duplicate submission. Ambiguous responses remain locked. `isDefinitivePrePlaceRejection` only unlocks specific private-boundary preflight errors. Hosted handoff validates provider URL; backend Order read determines authenticated payment result. | Loyalty conflict handling must distinguish a verified rejection-before-creation from ambiguous 409/422/transport failure. Preserve all existing handoff and reconciliation behavior. |
| Orders | Account server pages call `orders-boundary.ts` → `orders-api.server.ts` → `GET /orders/{encoded orderNumber}`. List filters/pagination use URL state. Details compose `OrderDetailsContent`, timeline/items/address/payment, cancellation and return/review islands. DTO/parser/mapper/domain currently omit Loyalty. | Extend existing Order read once; no Loyalty request per order item. Use `order_number`, not numeric id. Keep backend capabilities and timeline authoritative. |
| Notifications | `navigation-config.ts` has BellIcon linking `/notifications`; no matching route, notification feature, list API module or panel was found. Account notification preferences and Sonner toasts are separate concerns. | Reuse bell placement/icons and modal primitives; there is no existing notification centre to wire. Empty response alone cannot establish a nonempty schema or endpoint path. |
| HTTP/cache | `src/lib/api/http-client.ts` is runtime-neutral; `server-api.ts` injects explicit locale with backend adapter. Backend requests carry Accept-Language and X-Locale. GET retry policy differs from QueryProvider's retry 1; mutation retries disabled. Private browser routes use safe codes/no-store. | Preserve policies; no generic parser, broad invalidation, permanent new BFF, polling or client cache expansion. Authenticated account reads can remain server-direct. |
| i18n/design/tests | `routing.ts`: ar/en, Arabic default, always-prefixed routes; typed Locale. Messages in `src/messages/{ar,en}`. Tailwind v4 tokens in globals.css. Node test runner + TS-transpile harnesses, Playwright local fixture server. | Localized copy/Intl formatting, logical CSS, `<bdi>` for signed counts/order numbers, Asia/Riyadh dates. Add focused tests using existing tools. |

### Existing components worth reusing

- `Container`, `Button`/`buttonVariants`, `Switch`, `Skeleton`, `ErrorState`, `EmptyState`, `Badge`, `RafalModal`, local Crown/Info/ShoppingBag/Bell icons; canonical `Breadcrumbs` if a breadcrumb is needed.
- Account sidebar/navigation and existing `LoyaltyHistory` structure; revise its narrow data model, order links, signed quantities and pending/expiry metadata.
- `OrderFilterNavigation`/`OrdersPagination` are **patterns**, not domain-neutral components: their href builders are Orders-specific. Avoid importing them into Loyalty unchanged or generalizing both features prematurely.
- `CheckoutSummary`, `CheckoutStepSection`, shipping/payment sections and current quote/place hooks; existing skeletons and no-store boundaries.
- `OrderDetailsContent`, `OrderPaymentSummary`, `OrderTimeline`, `OrderItems`, `OrderAddress`, status badge and order formatters. Keep return approval distinct from refund completion.

## Visual inspection map

Measurements below are approximate image coordinates/proportions, not new design tokens or exact Figma measurements. Prefer current token equivalents and review differences before shared-shell changes.

| PNG in `src/design/loyalty/` | UI location / visible target |
| --- | --- |
| `loyalty-empty.png` (1440×1473) | Account Loyalty: content approximately x80–1048 (968px), sidebar x1080–1360 (280px), gap 32px. Black balance block about 176px tall, crown/large centred count, white bordered rule/history cards, about 20px vertical gaps. Empty history has centred crown/copy. |
| `loyalty-paused.png` (1440×1907) | Same account columns; taller balance block includes pending/expiry, gray paused notice, **no How It Works**, pill filters, divided history rows, outlined Show More button. |
| `loyalty-negative.png` (1440×1744) | Signed negative count in black card, pale gold explanation, pending line, rules retained, signed history values. Color supplemented by signs/text. |
| `Checkout.png` (1440×1521) | Main steps approximately x60–960 (900px); summary x1000–1380 (380px), 40px gap. Gold-tinted toggle card above totals, tender below VAT and distinct amount due. Current checkout composition/summary remains the integration point. |
| `order-in-preparation.png` (1440×1417) | Account columns, timeline and products full content width; address/payment below in two approximately 474px columns, 20px gap; earned-pending notice in payment card. |
| `order-cancelled.png` (1440×1601) | Cancellation timeline and red status, separate original gross, points tender, other payment amount, cancelled earning and returned-points notice. Screenshot cash refund assertion is not supported merely by points_returned. |
| `order-partially-returned.png` (1440×1657) | Delivered timeline, per-item returned marker/review buttons, several earning/refund notices. Partial-return amounts and row semantics remain integration-pending. |
| `notifications-panel.png` (448×580) | Visible panel about 400px wide with 24px outer image inset; white rounded surface/shadow, title/mark-all action, 5 divided icon/text/time rows, pale gold unread rows and dot, footer View All. No payload/read action is proven. |

Across images: quiet neutral page surfaces, black/white balance and primary controls, gold accents, thin neutral borders, rounded cards (visually around 12px). Existing radius tokens are 8/16/24px; do not introduce 12px globally. Screenshot shell is wider than the existing account `Container size="wide"` inner content at 1440px; log this visual difference rather than silently changing all account pages. Tajawal hierarchy and existing type-body/type-caption utilities are reusable. Screenshot examples/rates/payment options are illustrative, not defaults.

## Main risks and smallest recommended changes

1. **False money/status:** Account balance is not checkout usability. Preserve gross total and VAT; tender amount/amount due come from quote. Missing money must remain unavailable, never zero. `earned_status`, not order status, drives earned credit; returned fixture retains a historical date that must be hidden for cancelled earning.
2. **409 contract loss:** `/api/checkout/place/route.ts` currently collapses upstream 409/422 into `checkout-changed` and discards `errors.totals`. Existing attempt guard then retains an uncertain lock. Plan a narrow typed review result only once backend confirms no order was created and resubmission semantics; do not unlock all 409s.
3. **Incomplete settings:** Quote has usable/value_per_point but no verified minimum/cap settings. Obtain explanatory settings once from account summary for authenticated checkout; quote alone determines eligibility. Unknown reasons need neutral safe copy, not fabricated enums.
4. **Payment coverage:** Current executable Place methods are card/apple_pay/tap. Screenshot COD/bank transfer and story full-points payment do not authorize implementing new payment lifecycles. Zero-due tender-only placement needs a verified method/response contract.
5. **Notification integration missing:** Confirm endpoint, populated schema, unread/read/mark-all/deep-link contracts. Do not produce notifications from balance differences or confuse toasts with account messages.
6. **Cache lifecycle debt:** Canonical Cart keys are locale-scoped, not account-scoped. Existing logout clears cookies and navigates to auth, but does not explicitly clear Cart cache. Back navigation/account transitions need integration QA; no auth/cache redesign in this microtask. Query removal after Checkout is re-observed on navigation by the badge's pathname subscription.

## Cart badge delivered

`features/cart/components/cart-navigation-link.tsx` is the small client island used by guest/authenticated HeaderActions and MobileBottomNavigationClient. It selects `summary.totalQuantity` from the established canonical Cart query; this is Laravel `items_count`, also used by Cart's title and quantity overlays (sum of quantities, not distinct lines). Both mounted shell variants deduplicate the same query. Fresh cached reads/mutation writes are reused; a cold shell may initiate the existing Cart read, with no count endpoint or city projection request.

Zero/unknown hides the visual badge; unknown does not announce zero. Positive values display localized 1–9 or 9+, while the link name contains the full localized count. Black/white token contrast, absolute logical-end placement, fixed icon size, existing navigation dimensions and focus classes are retained. There is no animation/live-region spam. Initial SSR and hydration have the same unknown state; the count appears after the existing read without changing layout dimensions. Runtime tests do not substitute for browser hydration or device checks.

Verification and remaining manual QA are recorded in [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).
