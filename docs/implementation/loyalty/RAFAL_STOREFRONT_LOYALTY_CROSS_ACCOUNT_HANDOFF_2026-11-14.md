# Rafal Storefront Loyalty — Cross-Account Engineering Handoff

**Prepared:** 2026-11-14  
**Status:** Phase 4 IN PROGRESS when the former Codex session stopped; **NOT yet complete or verified**  
**Audience:** A new ChatGPT/Codex account continuing work on the **same local Git working tree**  
**Project:** `E:/freelance/rafal/rafal-website` (user's Windows machine; verify the actual workspace path).  
**Framework:** Next.js 16.3.3, React 19, TypeScript, Tailwind v4, next-intl (Arabic default / English), TanStack Query, App Router.

> **READ THIS FIRST. DO NOT RESET, RECLONE OVER, CLEAN, RESTORE, REBASE, REINSTALL OR REIMPLEMENT THE WORKING TREE.** The last assistant/Codex session was interrupted due to account usage limits. No evidence establishes that the current Phase 4 changes were committed or pushed. The code that matters is on the user's **existing local filesystem**, so the new account MUST open that exact workspace and discover its current state before touching files.

## 1. Non-negotiable project and mentoring rules

- This is the **Rafal Storefront Next.js repository**, separate from the **Rafal Dashboard React/Vite SPA**. Do not change the Dashboard for Storefront work.
- The user wants **Learn → Analyze → Decide → Implement → Review → Document** for meaningful choices; explain tradeoffs, but keep Codex executions quick and output compact.
- Prioritize **performance, reuse, maintainability, a11y, responsive RTL/LTR, visual fidelity, clear skeletons, zero invented backend financial logic, minimal API requests and minimal unnecessary renders**.
- **No overengineering**: reuse existing API client, DTO/parser conventions, shared UI, Server/Client component boundaries, queries, i18n. Do not introduce a generic parser, new validation framework, global Loyalty store/provider, new dependencies, broad refactors, or duplicate network calls.
- Existing **user stories and user-confirmed real Postman responses** are authoritative; the earlier BRD and old Postman collection are **STALE** and MUST NOT fill missing contracts.
- Treat supplied desktop screenshots as design references, not as proof of mobile specifications. Adapt mobile using existing design system and verify in browser; never falsely claim pixel-perfect compatibility without browser QA.
- Never assume tests, builds, manual QA or backend behavior were verified unless specifically reported as such.
- Backend owns loyalty earning, balances, holds, rules, redemption, expiration, tax, refunds, ledger, order lifecycle, and security. Do not implement a frontend permissions/RBAC system.
- Preserve all existing changes. Unless asked by user, do **not commit/push/deploy**.

## 2. Local authoritative reference files already supplied to this repository

The previous task installed a reference pack into this Storefront workspace; audit reported it under `src/docs` and `src/design` (these locations differ from the original ZIP paths; **verify the actual paths**):

- `src/docs/reference/loyalty/00-START-HERE.md`
- `src/docs/reference/loyalty/01-user-stories-source.md` — full supplied stories
- `src/docs/reference/loyalty/02-provided-api-examples-original.md` — examples supplied by user
- `src/docs/reference/loyalty/03-verified-api-contracts.md` — tested responses/contracts
- `src/docs/reference/loyalty/04-lifecycle-evidence.md` — test order chronology
- `src/docs/reference/loyalty/05-design-map-and-quality-bar.md`
- `src/docs/reference/loyalty/06-gaps-and-acceptance-checklist.md`
- `src/docs/reference/loyalty/fixtures/*.json` — real selected-field responses/fixtures; some files deliberately include only selected fields, not entire envelopes
- `src/design/loyalty/checkout.png`, `notifications-panel.png`, `order-in-preparation.png`, `order-cancelled.png`, `order-partially-returned.png`, `loyalty-empty.png`, `loyalty-paused.png`, `loyalty-negative.png`
- `docs/implementation/loyalty/ARCHITECTURE_AUDIT.md`
- `docs/implementation/loyalty/IMPLEMENTATION_PLAN.md`

**Do not reread this entire pack on each continuation.** The material is for targeted reference. For Phase 4, read only implementation plan Checkout sections, verified quote contract, checkout screenshot, relevant fixtures, and current checkout code. The user can also supply `Rafal_Storefront_Loyalty_Reference_Pack_2026-11-14.zip` if paths are missing; do not silently substitute stale sources.

## 3. Completed phases (from prior Codex reports; builds and browser QA outstanding)

| Phase | Status | Implemented |
| --- | --- | --- |
| Prior audit / plan | Done | Focused Next.js architecture audit, reuse inventory, design map, implementation plan, missing contracts. |
| Cart badge | Implemented and refined | Header + mobile navigation Cart count from existing canonical Cart query, sum of quantities, localized full accessible count, visual `9+`, gold `bg-gold-500` / white text, no border/ring, moved to touch icon's upper outer edge. **Manual position and color-contrast QA still necessary**. |
| 1 — Account Loyalty Summary | Implemented | Authenticated server `GET /loyalty`, real balance/value/pending/expiry/settings, dynamic How It Works, negative/paused/empty/error/loading states, AR/EN, no mock summary in live page. 8 focused tests reported passed. |
| 2 — History | Implemented | `GET /loyalty/history` real rows, four filters, 20/page, server-rendered initial page + small client Show More island using authenticated Server Action, dedup/retry/race protection, date/order links; no mock history in live path. 17 focused tests on initial report; later 13 targeted tests on review reported passed. |
| 3 — Order Details | Implemented | Extend existing `GET /orders/{order_number}` DTO/parser/mapper/domain/payment card; earned pending with backend date or return window, cancelled earned status, points redeemed/applied/due/returned, absent loyalty tolerated, no extra request. Cart badge adjusted again. 51 targeted tests reported passed. |
| **4 — Checkout Quote + UI** | **INTERRUPTED WHILE TESTING** | The last Codex message says: **“The Loyalty card and tender rows are wired into Checkout. Place is blocked whenever points are selected, including when the quote applies zero points. Only authenticated customers fetch the summary’s maximum-redemption setting; quote data controls eligibility and amounts. I’m testing serialization, stale responses, guest behavior, and the submission guards now.”** This is the **only known checkpoint**, not completion proof. |
| 5 — Place/409/Payments | NOT STARTED | Must safely implement real `use_points` at checkout/place with conflict/review, request freshness, payment handoff and duplicate submission guards. |
| 6 — Notifications | BLOCKED/NOT STARTED | Need populated notification item and mark-read/deep-link contract; existing shell bell is link only, not a real panel. |
| 7 — Final QA/release gates | NOT COMPLETE | Build, responsive/visual, a11y, payment E2E, and deferred backend integration tests. |

**Historical verification:** Tests, TypeScript, scoped lint and `git diff --check` passed for phases 1–3 as reported. **Production `next build` was not verified**, because local Windows Node/NVM reportedly says “No active Node.js version is configured”, including when child processes execute. Do not disguise this as a build pass or spend a long time on unrelated environment debugging. The new account can diagnose environment in a separate explicitly scoped task.

## 4. Current Phase 4 exact objective and safe boundary

**Phase 4 = Loyalty Quote Integration and Checkout Presentation, NOT points-enabled Place.**

Confirmed latest checkpoint: Loyalty card and tender rows already wired; Place **blocked if user selects points regardless of whether quote applies points**, so there is no silent drop of intent before Phase 5. Authenticated customers alone fetch summary setting for max-redemption explanation; Quote is authoritative for eligibility and monetary values. Codex was testing **serialization, stale responses, guest behavior, and submission guards** when limits expired.

When resuming:

1. Inspect `git status --short`, `git diff --stat` and current files; inspect untracked files as well. Distinguish completed edits, incomplete edits, tests, and potential runtime issues. **Do not use a clean checkout**.
2. Read current Checkout implementation and Phase 4 test files; **continue tests first**, repair only actual defects and finish incomplete pieces. Do not rerun an architecture audit or rewrite already-wired UI.
3. Verify quote `use_points: 0|1` through browser/private API parser, query key, upstream `FormData` serializer, and summary display; no transport changes. Keep quote freshness and response-race protection across points, address, shipping, gift, cart, coupon, etc.
4. Confirm authenticated-only summary settings read; guests must not trigger authenticated account reads. Avoid extra requests and global state.
5. Confirm points-selected Place is safely blocked in Phase 4 **even if `points_used` is 0**; normal place without points continues existing safe flow. Phase 5 will add points intent to Place.
6. Run targeted quote serialization, toggle ON/OFF, in-flight/race, stale-response, guest, disabled reasons, totals/VAT, loading/error, and submission guard tests; TypeScript, scoped lint, diff checks. Build once if environment permits.
7. Return concise report **READY FOR PHASE 5** or clear blocker. **Stop**. No Phase 5 implementation, commit/push or unrelated fixes.

### Quote implementation architecture discovered in audit

- `src/features/checkout/components/checkout-page.tsx`: existing state owner for selected shipping/location/gift/payment; intended `usePoints` client intent belongs here, not a second store.
- `src/features/checkout/hooks/use-checkout-quote.ts`: existing request-keyed TanStack Query + AbortSignal; no second quote hook.
- `src/features/checkout/api/checkout-query.ts`: quote key must include points intent.
- `src/features/checkout/components/checkout-summary.tsx`: visual payment tender beneath VAT, backend amount due.
- `src/features/checkout/{api,server}/` and `src/app/api/checkout/quote/route.ts`: browser JSON → private route → Laravel FormData; parse browser numeric `0|1` and serialize upstream as `"0"|"1"` multipart. Full path verify in repo.
- Reuse existing `Switch`, `CheckoutStepSection`, `Button`, `Skeleton`, responsive Checkout summary/mobile `<details>` and translations.
- Existing checkout Place has a synchronous attempt lock, ambiguous-result safety, `retry:false`, payment URL validation, server order read for payment reconciliation. Do not weaken these.

## 5. Verified backend integration evidence (exact essentials)

### Account summary

`GET /loyalty` authenticated. Data includes:

```json
{
  "available": 100, "value_sar": "5.00", "pending": 0,
  "pending_available_on": null, "expiring_soon": null,
  "is_negative": false, "is_paused": false,
  "how_it_works": {
    "amount_per_point": "1.00", "redeem_points": 100,
    "redeem_amount": "5.00", "max_redeem_percent": 50,
    "min_redeem_points": 100, "return_window_days": 15,
    "validity_months": 3
  }
}
```

After confirmed payment, `available=0`, `pending=2088`; after returned order, `available=100`, `pending=0`. `pending_available_on` is null before delivery and becomes `2026-11-29T14:12:51+03:00` after delivery.

### Checkout quote

`POST /checkout/quote` receives `use_points: 0 | 1` along with existing address/shipping/cart inputs. **Tested financial snapshot for the same cart:**

| Input/status | Gross `total` | VAT | Points used | Applied | `amount_due` | `disabled_reason` | `available / usable` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Funded, `use_points=0` | `2093.00` | `273.00` | 0 | `0.00` | `2093.00` | null | 100 / 100 |
| Funded, `use_points=1` | `2093.00` | `273.00` | 100 | `5.00` | `2088.00` | null | 100 / 100 |
| Zero balance, `use_points=1` | `2093.00` | `273.00` | 0 | `0.00` | `2093.00` | `min_not_reached` | 0 / 0 |
| Following pending order hold, `use_points=1` | `2093.00` | `273.00` | 0 | `0.00` | `2093.00` | `pending_order` | 100 / 0 |

Expected shape:

```json
{
  "data": {
    "totals": {
      "total": "2093.00",
      "vat": { "rate": "15.00", "amount": "273.00" },
      "loyalty": {
        "available": 100, "usable": 100,
        "points_used": 100, "amount_applied": "5.00",
        "amount_due": "2088.00", "value_per_point": "0.0500",
        "disabled_reason": null
      },
      "amount_due": "2088.00", "currency": "SAR"
    }
  }
}
```

**Important:** actual totals response contains other fields (lines, discounts, shipping, location). See fixtures/source for the full provided contract. **Gross/VAT stay unchanged; points are tender, NOT discount; display backend `totals.amount_due`**. Known `disabled_reason` values are `null`, `min_not_reached`, `pending_order`; don't invent full enums. `available` is not `usable`.

### Place & 409 conflict (Phase 5, not Phase 4)

`POST /checkout/place` accepts `use_points: 0|1`. User got HTTP **409** with `message = "تم تحديث قيمة النقاط، يرجى مراجعة الطلب"` and `errors.totals` matching the funded quote after quote intent had been switched off. A fresh `quote` with `use_points=1`, followed by Place with `use_points=1`, created order `RF-10147` and required Tap hosted payment. This **suggests** quote intent synchronization but does **not prove** all 409 semantics or that every such rejection guarantees no order was created. **Do not auto-retry Place.**

Place success contained:

```json
{
  "data": {
    "order_number": "RF-10147", "status": "new",
    "payment": { "method": "tap", "status": "pending", "paid_at": null },
    "money": { "total": "2093.00", "currency": "SAR" },
    "loyalty": {
      "points_earned": 2088, "earned_status": null,
      "available_on": null, "return_window_days": 15,
      "points_redeemed": 100, "amount_applied": "5.00",
      "amount_due": "2088.00", "points_returned": 0
    }
  }
}
```

After the hosted payment page seemingly reported failure, `GET /orders/RF-10147` showed `payment.status=paid`, `status=confirmed` and `loyalty.earned_status=pending`. **Payment redirects/messages are not authoritative; backend order status is.** No payment URL/tokens are included in this handoff, intentionally.

### Order lifecycle, genuine Postman tests

| Status | `earned_status` | `available_on` | Available | Pending | Returned points | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `new` + payment pending | null | null | 100 | 0 | 0 | Hold: follow-up Quote `usable=0` while available=100. |
| `confirmed` + paid | `pending` | null | 0 | 2088 | 0 | Ledger `redeem:-100` and `earn_pending:+2088`. |
| `processing` | `pending` | null | 0 | 2088 | 0 | Ledger unchanged. |
| `shipped` | `pending` | null | 0 | 2088 | 0 | Ledger unchanged. |
| `delivered` | `pending` | `2026-11-29T14:12:51+03:00` | 0 | 2088 | 0 | 15-day return window, NOT matured yet. |
| `returned` | `cancelled` | **still historical date** | 100 | 0 | 100 | Ignore availability date for cancelled earnings; restored redeemed points. |

After full return, Customer History showed `redeem_refund:+100`, `redeem:-100`, `adjust_credit:+100`, but **previous `earn_pending` was absent**. Whether backend deliberately filters cancelled pending rows is a question; do not synthesize the entry. Unknown partial return, cancellation, expiry/maturity remain unverified.

### History API

`GET /loyalty/history?type=all|earn|redeem|other&page=1&per_page=20` returns `data[]` and `meta { current_page,last_page,per_page,total }`, order `{id,order_number}` or null; signs and backend event labels authoritative. Out-of-range page returns 200, empty data, original requested `current_page`; empty filtered result returns `last_page:1, total:0`.

### Notifications

`GET /notifications` verified only with `data:[]` and `meta {current_page:1,last_page:1,per_page:15,total:0}`. **No populated payload**, no verified mark-all/read/destination contracts. Existing header bell is a link, no actual notifications centre. Don't generate speculative notification items.

## 6. Scope of user stories

The supplied Story Reference includes six complete supplied stories: earn pending when confirmed (LOY-02), maturity after return window (LOY-03), redeem at checkout (LOY-05), account balance/history (LOY-06), expiry warning (LOY-07), loyalty notifications (LOY-09). The stories refer to additional unsupplied LOY-04/08/10/12/13/14. Don't invent their detailed acceptance criteria. Backend owns operational rules; frontend presents returned values and appropriate UI states.

### Outstanding contract and release dependencies

- **Phase 5 blocker:** exact safe 409 review/resubmission contract and whether rejected Place is definitively before order creation; preserve existing duplicate-place lock and payment reconciliation.
- **Phase 5 blocker:** zero-amount-due / points-only order placement; current executable payment methods may require a payment method, so no fake card/COD logic.
- Hold release upon failed/expired payments, cross-device concurrent redemption, timeout: backend QA still due.
- Notification populated payload, read/unread, mark-all, routes and message destination.
- Full/partial return semantics, cancellation, actual matured `earned_status` response and never-expiring/null validity rules.
- Live data-driven UI for negative/paused/expiring states, >20 history, browser QA for all viewports/locales, and accessibility contrast of white on `bg-gold-500` Cart badge.
- Production build currently environment-blocked; fix separately or verify in properly configured environment before release.

## 7. Existing code architecture from focused audit (avoid duplicate implementations)

- `src/app/[locale]/(storefront)/layout.tsx` server storefront shell; account layout/auth guard, AccountSidebar and mobile account navigation already exist.
- `src/features/loyalty/` summary API/server/parser/components; history API, Server Action, small client pagination hook and component already live.
- `src/features/orders/` existing server-backed Order Details DTO/parser/mapper and payment summary extended in Phase 3; no second Loyalty fetch.
- `src/features/cart/api/cart-query.ts` owns canonical Cart query, `summary.totalQuantity` and cache mutation updates; `CartNavigationLink` exists in shared HeaderActions/mobile navigation.
- `src/features/checkout/` owns original quote, place, payment/redirect/attempt protection; Phase 4 edits are in-flight here. Do not introduce a new global query/cache or duplicate request paths.
- Existing UI tokens/components (`Switch`, `Skeleton`, `Button`, account/checkout cards, local icons, `ErrorState`, `EmptyState`) and `src/messages/ar|en` should be reused.
- Existing notification bell has no complete feature or popover.

## 8. Pre-resume critical checks (new account)

1. Confirm opened local folder is **the user's existing** `E:/freelance/rafal/rafal-website` (or actual path), not a fresh or separate repo.
2. Run `git status --short` and `git diff --stat`; include **untracked** files in inspection. Look at any partial test output/review artifacts from interrupted session.
3. Identify exactly what Phase 4 implementation already exists. Do **not** copy the old prompt wholesale into a fresh build; it could overwrite existing work.
4. Check current Node environment only enough to run tests; don't keep rebuilding 30 minutes due to NVM.
5. Verify current request serialization, React Query key with usePoints, stale request handling, guest path, disabled states, and Place safety; run targeted tests.
6. Do not conclude Phase 4 is complete until tests (at least targeted), TS, lint, diff checks report success and current code is inspected. Report build as blocked if NVM is not fixed.
7. Request **a concise final report and changed files**, then stop before Phase 5 and ask user/mentor to review.

## 9. Suggested next-step sequence after Phase 4 review

1. **Phase 5:** Points-enabled `checkout/place`, safe fresh-quote submission, typed 409 review handling with backend confirmation, hosted payment reconciliation, request/transport failure and duplicate order safety. Do not ship full-points zero-due path until verified.
2. **Phase 6:** Notifications when backend supplies real item schema and read/deep-link semantics. Frontend may use existing shell primitives, but no invented data.
3. **Phase 7:** End-to-end browser QA for Arabic/English, mobile/tablet/desktop, keyboard/focus/screen-reader, no overflow, screenshot comparison, skeleton-to-content layout shift, guest/auth transitions, network counts, backend integration, clean build.

## 10. Provenance and confidence

This file consolidates the user's supplied stories, reference-pack reports, Postman testing performed manually by the user, and the outputs of prior Codex runs as pasted into chat. **No access to the user's current Windows filesystem exists in this chat**; this handoff cannot attest to the exact uncommitted Phase 4 diff or its compilation status. The new Codex session must validate the live working tree before changing code. The supplied eight PNGs and full stories live in the repo reference pack; this handoff intentionally does not duplicate all story text or copy payment session URLs.
