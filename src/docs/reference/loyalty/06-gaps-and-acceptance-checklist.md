# Readiness, open questions and staged acceptance checks

## Verified enough to begin feature implementation
- [x] Account balance/settings payload and history structure.
- [x] History `page`/`per_page`, out-of-range handling, `earn` empty and `other` adjustment row.
- [x] Quote with use_points=0/1, available vs usable and `disabled_reason` examples.
- [x] Order place with points (Tap test payment pending then backend paid).
- [x] Order details loyalty object for new, confirmed, processing, shipped, delivered, fully returned.
- [x] Pending points, eligibility date, refund of redeemed points and ledger effects.
- [x] Notification **empty response only**.

## Unverified/needs contract or QA — DO NOT silently invent
- [ ] Notification nonempty item, event payload, deep links, mark-as-read and templates (LOY-09).
- [ ] Partial return, negative balance after clawback, cancellation (LOY-04 referenced but full story not supplied).
- [ ] Point maturity after return window, expiry jobs and warning delivery.
- [ ] Failed payment/expired payment hold release and concurrent redemption protection.
- [ ] What exact steps are required after 409 quote/place mismatch; avoid auto-resubmitting.
- [ ] All supported `disabled_reason` enum cases, programme paused checkout behavior.
- [ ] Guest order claim / COD reconciliation / refund timing, if in Storefront scope and existing flows.
- [ ] Whether `earn_pending` disappearance from customer history after return is intentional.
- [ ] Unbounded validity when `validity_months=null`, guest claim days are backend alignment items, not confirmed live.
- [ ] Actual populated history at >20 rows and multi-page navigation.
- [ ] Responsive source design for tablet/mobile (not supplied).

## Phase acceptance — frontend
### Account Loyalty
- correct balance/pending, signed quantities and SAR formatting, derived copy from `how_it_works`, dynamic paused and negative states, empty history and error/retry.
- correct filter semantics and server-side history page handling; order links use `order_number`, not `id`.
- date/time timezone-aware formatting, RTL/LTR and accessibility; no extra identical requests.

### Checkout
- toggle quote invalidates/requotes based on selected shipping/address/cart/coupon; disabled/rejected states reflect backend; price breakdown uses total/amount_due and VAT without re-calculating.
- async loading/disable confirmation until fresh quote, protect from stale responses; no accidental double place; 409 review updated totals; payment redirect and server status reconciliation.

### Order Details
- order new/pending `earned_status:null` avoids falsely promising pending credit; confirmed/shipped pending text; delivered shows `available_on`; returned/cancelled shows cancelled even if stale `available_on` remains; points redeemed/refunded summary with server fields; partial return deferred unless supported by response.

### Notifications
- integrate into existing bell using supported server payload when confirmed; proper links, empty state, unread and access when logged out; do not fabricate client-only events.

### Shared cart count microtask
- count sourced from shared cart state, no new unnecessary request, handles quantity changes/guest/login/hydration, localizes label, responsive badge placement, accessible for screen readers and not disruptive to header layout; test 0/1/9/10+ counts.

### Engineering release gates
- targeted tests around changed flows; typecheck, lint, build; visual manual review desktop baseline plus varied mobile widths; accessible keyboard checks; defer external backend lifecycle unverified scenarios with clearly named risks. Do not promise 100% on all screen sizes without testing.
