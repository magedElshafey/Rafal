# RF-10147 — Verified order / loyalty lifecycle

**Test only, 2026-11-14, all timestamps from the API in +03:00 Asia/Riyadh.** Real Postman responses are user supplied. `fixtures/` stores representative **selected** fields and is not a verbatim full collection.

## Sequence

| Phase | Order status / payment | Loyalty earned status | Balance available | Pending | `available_on` | Ledger consequence |
|---|---|---|---:|---:|---|---|
| Before order | n/a | n/a | 100 | 0 | null | `adjust_credit +100` |
| Place | `new` / `pending` | null | 100 | 0 | null | hold inferred from subsequent `usable=0`; no redeem ledger yet |
| Confirmed | `confirmed` / `paid` | `pending` | 0 | 2088 | null | `earn_pending +2088`, `redeem -100` |
| Processing | `processing` / `paid` | `pending` | 0 | 2088 | null | unchanged |
| Shipped | `shipped` / `paid` | `pending` | 0 | 2088 | null | unchanged |
| Delivered | `delivered` / `paid` | `pending` | 0 | 2088 | 2026-11-29T14:12:51+03:00 | unchanged |
| Returned (full) | `returned` / `paid` | `cancelled` | 100 | 0 | **still populated** (historical) | `redeem_refund +100`; `earn_pending` stops appearing in customer history |

- Created at `2026-11-14T13:44:40+03:00`; payment confirmed `13:54:00`; Processing `14:10:29`; Shipped `14:11:47`; Delivered `14:12:51`; Full returned `14:13:46`.
- At creation checkout quote had 100 points = 5 SAR, gross 2,093, amount due 2,088; place response agreed.
- During pending payment, balance endpoint still said available=100 while subsequent quote said available=100, usable=0, points_used=0 and `disabled_reason='pending_order'`. Evidence of hold exclusion in this scenario; not concurrency proof.
- At confirmed payment, customer order details returned `earned_status='pending'` and `points_earned=2088`. Ledger at 13:54 recorded `earn_pending +2088` and `redeem -100`.
- At Processing and Shipped, no points ledger or balance change.
- Delivered sets exact availability timestamp to 15 days after delivery, leaves points pending.
- Full return restores 100 redeemed points (history `redeem_refund` with expires_at `2027-02-14T23:59:59+03:00`), cancels 2,088 pending points, retains stale order-level `available_on` but global `pending_available_on` becomes null. Renderer must gate date by `earned_status`.
- At Returned, API `customer_status='cancelled'`, order `status='returned'` and all 4 timeline steps `reached=false` in returned response. Avoid claiming status names are synonyms. Design offers separate cancelled/partial-return screenshots, but partial return wasn't verified.
- At Shipped `can_cancel=false`; at Delivered `can_request_return=true`; at Returned false. Continue to use backend-provided flags where already part of current UX.
- A 409 conflict occurred when placing with use_points=1 after a prior quote using 0. Re-quote use_points=1 then place succeeded. Treat as a review/reconfirmation scenario, not automatic retry.
- Payment page appeared to fail to the tester, but Backend showed `paid`; frontend must reconcile server order/payment status, especially after redirect.

## Real contracts vs assumptions
- No earned-points maturity tested: **do NOT display 2088 as available** at delivery.
- No partial return or cancellation tested. No actual negative/paused response tested (only designs).
- User story says earliest-expiring lots used first and redeemed points can return on cancellations; backend owns this.
- Customer history omitted previously visible `earn_pending` after full return; clarify whether this is intentional display filtering or ledger visibility behavior; do not synthesize missing history rows.
- Need backend QA for hold release, guest claim, COD reconciliation, 409 semantics, gift vs buyer, and cases with points value changes.
