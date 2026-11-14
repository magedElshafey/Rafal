# Loyalty implementation plan

Date: 2026-11-14. **Planning only: no Loyalty feature code was changed.** See [audit](./ARCHITECTURE_AUDIT.md) for evidence, existing architecture and all eight screenshot observations. Current requirements are the supplied stories and verified Postman responses under `src/docs/reference/loyalty/`; stale BRD/collections are not used to fill gaps.

## Dependency order and release gates

| Phase | Concrete deliverable | Dependencies / completion gate |
| --- | --- | --- |
| 1 | Account summary + dynamic rules; replace mock boundary | Verified `/loyalty`; preserve sign-in guard and show read failures honestly. This is the recommended first task. |
| 2 | History filters, pagination and full account states | Phase 1 types/localization; verify complete fixtures and confirm Show More interaction below. |
| 3 | Read-only Order Loyalty | Extend existing Order DTO/parser/mapper once; verified lifecycle plus honest null/unknown states. Can proceed independently of Checkout. |
| 4 | Quote redemption and tender breakdown | Phases 1/3 financial vocabulary; complete quote parsing, current identity/quote lifecycle. |
| 5 | Place/review/payment reconciliation | Phase 4; backend confirmation of definitive Loyalty 409 rejection, zero-due flow before enabling that scenario. Preserve duplicate guards. |
| 6 | Notification centre integration | Blocked on endpoint/populated payload and read/deep-link contracts. Reuse shell and primitives, not a nonexistent centre. |
| 7 | Release validation | Focused contract/component/E2E + responsive/a11y comparison; backend lifecycle checks tracked separately below. |

No new library, global state, authentication model, generic normalizer or backend business logic is needed. These phases are proposed work, not authorization to ship unverified scenarios.

## 1–2. Account balance, rules and history

**Existing touchpoints:** `src/app/[locale]/(storefront)/account/loyalty/page.tsx`, account layout/sidebar/navigation; `src/features/loyalty/{types/loyalty.types.ts,server/loyalty-boundary.ts,components/loyalty-history.tsx}`; `src/messages/{ar,en}/account.json`.

**Proposed additions:** feature-owned `api/loyalty-api.server.ts`, `api/loyalty-dto.ts`, small `api/parse-loyalty-dto.ts`; `components/loyalty-balance.tsx`, `loyalty-rules.tsx`, `loyalty-history-controls.tsx`, `loyalty-skeleton.tsx`; route `loading.tsx`/`error.tsx` where needed. Keep mapping in the feature boundary unless its size justifies a separate mapper. Retire `mock-loyalty-data.ts` from the live boundary, with no mock fallback. Do not reactivate the commented profile summary without a separate task.

**Server/data ownership:** Require user and resolve access token server-side, pass configured Locale to `serverApi`. Read `/loyalty` and first `/loyalty/history` page concurrently after auth. Reuse request memoization only when the same summary is actually consumed twice; no shared cross-user cache. Keep these authenticated reads uncached under the current dynamic rendering model; the shared HTTP core does not expose a Next cache option, while existing private Route Handlers explicitly use no-store. Validate envelope, money strings, signed point values, booleans/nulls, dates and pagination where consumed; no broad schema framework. Treat malformed required values as errors, not fabricated zeros.

**History state/interaction proposal:** Screenshot shows Show More, while existing Orders uses page links. Prefer URL filter `type=all|earn|redeem|other` with page reset and server first page; a narrow Show More island can append 20-row backend pages using an authenticated Server Action (credentials require server execution). Keep pagination/cursor local to that island, reset it by filter key, and ignore late responses from old filters. This follows existing first-page-server/load-more interaction patterns without adding a read Route Handler or a global cache. Confirm this interaction before implementation if product expects shareable page numbers instead; the simpler URL page-link pattern is already present in Orders but differs visually. Do not accumulate all history on the server or fetch every page ahead of time.

**Tasks and acceptance:**

1. Display `available` (signed), `value_sar`, pending separately, `pending_available_on` only when provided, and `expiring_soon` only when present. Null pending date means date unavailable/before delivery, not zero pending or today. Format dates in Asia/Riyadh and signed values with locale and bidi isolation.
2. Build all numeric How It Works copy from `how_it_works`: amount per point, redeem points/amount, cap, minimum, return-window days, validity months. No hard-coded example 10 SAR/12 months. `validity_months:null` means no expiry only after contract confirmation; distinguish missing from null. Generic explanatory prose must follow supplied stories, never infer exclusions from missing flags.
3. Paused: retain balance/history, show preserved-balance notice, hide rules. Negative: retain signed balance and pending; state explicitly there is no money owed and redemption resumes when permitted. Allow flags to coexist; do not discard one silently. Empty zero balance and empty ledger are separate states.
4. History uses backend labels and open-ended type strings; do not limit to earned/redeemed or synthesize events. Show ± points, pending tag, original expiry, date, optional order link using `order_number`; null order has no fabricated link. Newest-first order is backend-owned. Post-return omitted `earn_pending` stays omitted.
5. Distinguish total=0 from out-of-range page (total>0 with empty data). Offer first-page recovery for out-of-range; no misleading “no history”. End Show More from pagination metadata, suppress duplicate IDs, preserve loaded rows on a failed later page and provide retry. Check page identity so late/mismatched results cannot append.
6. Matching skeleton cards/rows; separate section errors where practical so a history failure does not hide a valid balance. Retry through existing route/action patterns, never display raw error text. Private account metadata follows existing Orders noindex practice.

**Accessibility/responsive:** Reuse existing lg sidebar/native mobile details. Stack balance/notice/rules/history at small widths, allow pending/expiry copy to wrap; filters wrap or scroll locally without page overflow. Use headings, labelled filter controls/current selection, semantic list/time/link markup, full accessible order labels, non-color signed status, and polite loading/result announcements in the pagination island. Preserve focus on Show More and expose newly loaded count. Empty content is centred like the image, not a tiny paragraph.

**Tests:** summary fixture parsing; null/signed/paused/combined states; dynamic settings change without modifying historical values; signed/order-null rows; all four filters, reset, empty/out-of-range/last-page, late response/retry/duplicate page; auth failure. Use synthetic edge-case fixtures clearly labelled as frontend tests, never as verified backend evidence. Actual >20-row live response remains QA debt.

## 3. Order details

**Reuse/change:** `src/features/orders/api/{orders-dto.ts,parse-orders-dto.ts,orders-mapper.ts}`, `types/order.types.ts`, `components/{order-details-content.tsx,order-payment-summary.tsx,order-details-skeleton.tsx}` and account translations. Add small server-compatible `components/order-loyalty-summary.tsx` only if the notices justify extraction. Reuse Order formatters, timeline, items, status badges, existing loading/error/not-found routes. `GET /orders/{order_number}` already exists; do not add another request.

**Ownership:** Server-rendered read-only presentation, with existing cancel/return/review client islands unchanged. Preserve absent Loyalty as unknown/not supplied for older/guest responses, not a zero object. Existing guest DTO reuse must not make a Loyalty object mandatory on an unverified guest payload.

| Backend Order situation | Required Loyalty presentation |
| --- | --- |
| New, payment pending, `earned_status:null` | Never assert credited or pending ledger. A nonzero snapshot may be described as expected only with approved copy; otherwise omit status line until confirmed. |
| Confirmed / processing / shipped, earned pending, date null | Show pending points and backend return-window days after delivery; no invented date. |
| Delivered, earned pending, date provided | Show pending until actual `available_on`; delivery is not maturity. |
| Fully returned, earned cancelled, stale date provided | Show cancelled earning, omit pending availability date; show server `points_returned` independently of payment.status (fixture remains paid). |
| Cancelled | Display actual earned status/points returned if supplied; do not infer from order/customer status or copy full-return fixture as cancellation evidence. |
| Matured/available | Render only a confirmed earned-status mapping. Exact live enum/payload still needs evidence; do not equate delivered with available. |
| Partial return | Integration-pending; no item-return markers, clawback total, net earned value or cash-refund assertion from guesses. |

**Acceptance:** Omit earned line when actual points are zero per story. Gross `money.total`, points redeemed, applied amount and remaining payable each retain their own meaning. `amount_due` is not proof of card payment or cash refund. `points_returned` does not establish cash refund amount or completion. Reuse backend capabilities for actions; no recalculated return window or guessed timeline steps. Unknown statuses use neutral safe presentation without promising availability. Static notices need no live region.

**Tests/UX:** Extend existing Orders parser/mapper and payment-result tests with new/confirmed/processing/shipped/delivered/returned selected-field evidence merged only into clearly synthetic complete test envelopes. Verify stale date suppression, missing Loyalty, zero earning, unknown status, signed/wide values and separate tender/gross. Preserve vertical mobile timeline and md two-column address/payment layout; wrap notices and order numbers. Loading/error semantics remain route-owned.

## 4–5. Checkout redemption, conflict review and payment

**Existing files to extend:**

- `src/features/checkout/types/checkout.types.ts`; `api/{checkout-dto.ts,checkout-place-dto.ts,parse-checkout-dto.ts,parse-checkout-place-dto.ts,checkout-mapper.ts,checkout-place-mapper.ts,checkout-serializer.ts,checkout-place-serializer.ts}`.
- `server/{parse-checkout-quote-request.ts,parse-checkout-place-request.ts,checkout-boundary.ts}`, existing `/api/checkout/{quote,place}/route.ts` and `api/checkout-place-mutation.ts` if a safe typed conflict result is added.
- `components/{checkout-page.tsx,checkout-summary.tsx}`, `api/checkout-query.ts`, current hooks/attempt/payment-decision/handoff utilities only where needed; `src/messages/{ar,en}/common.json`.
- Add `components/checkout-loyalty.tsx` composing existing Switch and InfoNotice; no separate quote hook, cache, form library or endpoint.

**State/integration:** CheckoutPage owns only redemption intent (`usePoints: 0 | 1`), not calculated points or money. Quote owns eligibility, usable balance, points_used, amount_applied, amount_due and disabled_reason. Supply explanatory cap/minimum settings from one authenticated server summary read (Phase 1); failure there must not invent settings or override quote eligibility. Guest checkout does not mount redemption or fetch account summary.

1. Add the intent to quote/place request types and server allowlists. Require numeric 0/1 at browser boundary; serialize `use_points` as multipart 0/1 for saved/raw/gift addresses and every existing place method. Ensure Place receives the intent of the accepted fresh quote, not an older closure.
2. Include intent in the existing quote key. Update commitDestination/selectShipping/gift refresh invalidation paths to use the complete request. Cart/coupon changes must invalidate the affected checkout quote; do not assume 30s cache freshness means current server holds/rules. Before submission use a fresh quote for current inputs; decide exact freshness barrier with the 409 contract, without creating a second quote loop.
3. While changing address/city/shipping/gift/cart/coupon/points, block Place until the matching quote succeeds. Preserve AbortSignal cancellation and key-based stale-response protection; rapid ON→OFF→ON must not revive an old cached eligibility result. Do not mirror server totals in React state or add an effect that re-quotes on every render.
4. Known reasons are only null, `min_not_reached`, `pending_order`. Show localized confirmed reasons; unknown reason disables redemption with neutral text. Never decide usability from account `available` (verified pending-order quote has available=100, usable=0). Negative/paused checkout reasons are not verified enums.
5. Preserve subtotal/coupon/shipping/fees/gross and VAT. Show points as **payment tender below VAT**, then backend amount due; no VAT recalculation or subtraction to invent a missing amount. Validate required money at the boundary; mismatched duplicate `totals.amount_due`/`loyalty.amount_due` must not be silently chosen—confirm canonical precedence or fail the quote safely. Missing/incomplete quote blocks Place and displays retry.
6. On verified Loyalty 409: preserve a narrow safe `errors.totals` representation or re-quote once with the same intent, announce changed values, require explicit review/confirmation, then allow resubmission **only after backend guarantees this rejection created no order**. All other 409/422/transport/malformed success paths retain the existing uncertain-order lock. Never automatically retry Place; no invented confirmation token or idempotency key.
7. Continue existing hosted payment URL validation and authenticated backend payment reconciliation. Redirect success/failure is not truth (verified tester saw apparent failure while Order was paid). Avoid duplicate orders on back, double click or delayed callback; no excessive polling. Refresh affected account/order data on subsequent navigation/explicit need, not every mutation or all queries globally.
8. Full points coverage: story requires hiding payment methods and paid placement, but current parser demands an implemented method. Obtain zero-due method/response contract before this path; do not fake `card` or auto-confirm. COD/bank transfer and hold release require backend/payment work beyond the badge and verified hosted path.

**States/a11y/responsive:** use a labelled native switch with described eligibility/applied-points copy, disabled during pending transitions; polite summary update and clear inline error/review notice. Do not move focus merely on toggle; focus the review notice when submission requires action. Keep existing checkout desktop grid and mobile summary `<details>` behavior, ensure toggle/tender/amount due remain discoverable when collapsed. Preserve summary geometry with corresponding skeleton slots; long amounts/copy wrap and CTA remains reachable above safe-area navigation. No mobile design is asserted by screenshots.

**Tests:** quote/place parser + wire serialization of 0/1 across destinations; unknown/missing money; funded ON/OFF VAT invariant (273, gross 2093, due 2088 vs 2093); minimum and pending_order; rapid toggles/shipping/address/gift/coupon changes and stale response; 409 review without auto-submit, two clicks → one Place, ambiguous timeout stays locked; hosted redirect failure with backend paid; guest behavior unchanged. Extend existing `tests/checkout-*.test.mjs`, `payment-result.test.mjs` and targeted `tests/e2e/checkout-payment-flow.spec.ts`, using existing fixture server. Keep real lifecycle QA separate.

## 6. Notifications (integration blocked)

**Reuse:** shell `HeaderActions.tsx` / navigation-config BellIcon; `RafalModal`, Button, Skeleton, empty/error primitives, localized Link, existing safe-return auth helper. Sonner and account preferences are not a notification feed. Proposed feature: `src/features/notifications/{api,server,types,components}` with a small bell/panel client island only after payload/path are confirmed. Add `/notifications` page only when the View All route and pagination scope are agreed.

**Data ownership:** server resolves credentials; first-open read once, reuse panel state while mounted, explicit pagination/retry/read updates. No global event bus, balance-diff events, client scheduling, broad invalidation or background polling. Exact DTO, read/unread mutation and deep-link mapping are blocked; do not design a fictional item schema.

| Supplied event | Intended destination |
| --- | --- |
| Points available; expiring soon; expired | Account Loyalty |
| Points returned; reversed/clawed back | Referenced Order details |
| Manual adjustment; bulk grant; Salla transfer; guest orders claimed | Account Loyalty |

Order confirmation expected-points line belongs to the backend notification template, not a separate frontend-generated event. Backend owns aggregation, template language, opt-in exceptions, push channels/quiet hours and independence from marketing consent. Missing/unavailable target falls back to Loyalty; signed-out target uses existing validated sign-in return path.

**Acceptance after unblock:** populated/empty/error/loading states, unread treatment not solely color, safe text (no raw HTML), correct supported links and read/mark-all behavior; no payload guessed from the screenshot. Desktop constrained panel and existing modal/mobile sheet behavior, keyboard opening, Escape, focus containment/restoration, labelled actions, bounded scrolling and touch access. Confirm whether desktop should be modal or nonmodal before wiring RafalModal semantics. Tests cover safe destinations, authentication, read success/failure, empty paging and focus; real notification delivery remains backend QA.

## Supplied-story traceability

All six supplied stories are covered below. Referenced LOY-04/08/10/12/13/14 full stories were not supplied; do not invent their acceptance criteria. Dashboard administration is excluded.

| Story / supplied acceptance | Frontend work | Backend acceptance / deferred evidence |
| --- | --- | --- |
| Earn pending (LOY-02): AC01–04,06; alternatives cancellation-before-confirmation, paused/blocked after placement, gift buyer | Phase 3 displays actual snapshot/status; no pending assertion at new/null. | Single pending row, guest/no row, SyncFailed retry idempotency, stored rate, COD earning, buyer ownership, snapshot honored after pause/block are backend responsibilities. |
| Earn pending AC05 | Phase 3 hides actual zero-earned line. | Floor calculation for 8 SAR example is backend-owned. |
| Maturity (LOY-03): AC01–05; rejected/open/partial returns, deletion, failed job | Phases 1/3 show returned pending/available state and dates, never mature locally. | Date boundary, open-return lock, COD reconciliation, negative-offset credit, expiry lot, deletion and catch-up job require backend tests. Proposed job times are not frontend timers. |
| Redeem (LOY-05): AC01–04,08; rules/expiry/paused changes | Phases 4/5 show quote-authoritative maximum/decimal tender and unchanged VAT; minimum disabled state and explicit review. | Cap/conversion calculation remains backend-owned; paused/expiry conflict payloads need verification. |
| Redeem AC05–07; COD and full-payment main flow | Quote usable/disabled reason, fresh quote, no duplicated Place; no client holds. | Concurrent app/web, failed-payment release, 30-minute inactivity release, COD amount and zero-due placement are unverified. |
| Balance/history (LOY-06): AC01–05; paused/error alternatives | Phases 1/2 separate available/pending, format SAR, dynamic rules, expiry warning, signed negative balance, paused hides rules, retry, filters/20-row paging. | Real paused/negative and multi-page samples still needed for integration confidence. |
| Expiry (LOY-07): AC01–05 and alternatives | Phases 1/2 render supplied expiry dates/expire rows; Phase 6 displays server warning events. | Lot ordering, exact expiry boundary, warning deduplication, old/new validity, never-expire, held expiry and refund lots are backend-owned/unverified. |
| Notifications (LOY-09): AC01–05 and both alternatives | Phase 6 renders all nine supplied event families with safe destinations and sign-in fallback. | Aggregation, disabled push still in-app, changed template, quiet-hour delay and marketing-consent independence need backend tests. |

## Unresolved dependencies / explicit deferrals

1. **Backend:** populated notification schema/endpoint, deep-link/read/mark-all contracts and template ownership. Only empty pagination wrapper is verified.
2. **Backend:** partial returns, cancellation, negative clawback and refund amounts/timing. `points_returned` cannot establish cash refund. Confirm whether disappearance of earn_pending after full return is intended customer history filtering.
3. **Backend:** maturity enum/payload after return window, expiry/never-expire null semantics, warning delivery and multi-page history (>20).
4. **Backend:** complete disabled_reason enum, paused checkout response, any quote field for cap/minimum, duplicate amount_due precedence.
5. **Backend:** 409 definitively-before-creation guarantee, complete error envelope and resubmission protocol. No auto-retry/token protocol is assumed from one successful re-quote.
6. **Backend:** failed/expired payment hold release, inactivity release and concurrent redemption. No frontend hold-release endpoint or timer is invented.
7. **Backend/product:** guest claim, COD reconciliation, zero-due tender-only placement, bank transfer/COD executable flow. Current supported payment choices remain unchanged.
8. **Design/product:** no mobile/tablet reference; approve proposed responsive adaptation when it materially differs. Account container width/radius differences are recorded; do not refactor the entire account shell to match one screenshot. Confirm Show More versus URL numbered-page behavior and notification popover modality.

These dependencies do not block the first read-only Account task. They block the corresponding unsafe or unverified integrations, not documentation or the Cart badge.

## Responsive and verification checklist for future Loyalty work

- [ ] Compare original 1440px screenshots for proportions, hierarchy, borders, spacing, icons and notices; no example values copied into live defaults.
- [ ] 320/375/390/430px: one column, mobile account details, wrapping filters and signed values, usable summary/toggle, no page overflow; retain footer/navigation safe-area clearance.
- [ ] 768px tablet: verify order md columns/timeline and account navigation; 1024px laptop: lg sidebar and Checkout summary do not squeeze controls; 1440px desktop comparison.
- [ ] Arabic RTL + English LTR, long labels/order IDs, large points/SAR, 200% zoom, bidi signs, locale switch and Asia/Riyadh date boundaries.
- [ ] Keyboard/visible focus, switch Space/Enter, pagination focus, panel Escape/return focus; touch targets and screen-reader status/labels.
- [ ] Reduced motion before load and toggled at runtime; no essential state depends on animation.
- [ ] Slow/offline/error/retry, late hydration and no-JS server content; matching skeletons and no false zero balances.
- [ ] Request counts for initial load/filter/page/toggle, no duplicate summary fetch, race cancellation and no blind mutation retries; preserve LCP/CLS and inspect changes with comparable data/network if performance-sensitive.
- [ ] Focused tests, typecheck, scoped lint, production build for route/server changes; no unrelated full-suite repairs.

## Cart badge verification for this run

- Focused `tests/cart-navigation-link.test.mjs`: 3 tests passed (AR/EN × desktop/mobile × 0/1/9/10/1234; unknown state, canonical changes/removal; real QueryObserver dedup/cache updates).
- TypeScript `tsc --noEmit`: passed.
- Scoped ESLint (three changed TSX files and the new test): passed. `git diff --check`: passed.
- Focused regression run (`cart-navigation-link`, `cart-layout`, `category-navigation`): 14 tests passed; no full-suite run.
- Production `next build`: blocked by local Node/NVM environment. Turbopack's PostCSS child process exits with “No active Node.js version is configured” while processing the unchanged address-map CSS module. Running installed Node directly and a process-local PATH prepend did not resolve the child process error. No build success or application regression is inferred; no unrelated module was changed.
- Tests use synthetic cache snapshots and mocked transport; no live account/session mutations or provider payment calls were made. Initial Node shim reported no active version; checks were run with installed Node v24.21.0 directly, without changing machine configuration.

### Manual QA Needed

- Desktop/mobile: inspect badge position at 320/390/768/1024/1440px, counts 0/1/9/10+, resizing across md; confirm header spacing and bottom-nav Cart label/click target.
- Keyboard/RTL: AR and EN Tab/Shift+Tab focus, accessible full count and localized Cart navigation, bidi 9+ placement; screen-reader label updates without duplicate announcements.
- Slow network/hydration: first load and failed/refetched Cart; unknown count must not appear as zero, no hydration warning/layout shift, existing count retained during background refresh. Reduced motion must have no badge animation.
- Commerce lifecycle: actual guest add/update/remove/clear and rollback, authenticated login merge/logout/back navigation, locale switch and confirmed Checkout cache removal. Existing cache is not account-keyed; verify identity transition freshness without redesigning Auth in this microtask.
- Network/performance: inspect real browser request count with both responsive variants mounted and existing PDP/Cart consumers; ensure no additional count endpoint, no duplicate same-key fetch, stable icon dimensions/CLS.
