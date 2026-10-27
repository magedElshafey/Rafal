# Payment lifecycle contract boundary

Reviewed 2026-10-27. This records the available evidence, not a declaration that
all backend payment methods or authenticated payment paths are complete.

## Evidence and current actions

| Boundary | Evidence | Frontend behavior | Remaining evidence |
| --- | --- | --- | --- |
| Payment discovery | Supplied documented HTTP 200 example lists card, apple_pay, bank_transfer | Actual response controls displayed options; only implemented Card can submit independently of discovery | Mandatory Place eligibility authority is not established; standalone tap is not established as an active method |
| Guest Card Place | User-confirmed real Guest Card journey; sanitized OTP Card fixture | Creates order, saves phone lookup/verification context, navigates to OTP; submission locks prevent repeated Place within the mount | Cross-reload/backend idempotency semantics are not established |
| Guest Verify | User-confirmed current response: success, pending_verification, requires_verification=false, Card pending, null paid_at, top-level meta.payment | Validated hosted-payment-required; exact original order identity; no confirmation claim | Physical-browser/provider smoke test after changes |
| Earlier Guest Verify flag variant | Existing fixture/implementation uses requires_verification=true with the same pending hosted evidence; prior journey was reported working | Retained for compatibility; conflicting metadata flags rejected | No separate raw Postman example supplied in this task |
| Place, confirmed/paid | Supplied documented HTTP 201 excerpt establishes confirmed/paid Card with paid_at; not newly live-verified or identity-specific | Existing confirmed branch; browser coverage uses synthetic authenticated identity | Current authenticated request/response example for each submitted method; fixture coverage is not proof of live behavior |
| Place, direct hosted | Existing fixture: new order, tap/pending, false verification, top-level hosted metadata; identity/submitted method provenance unavailable | Recognized by normalization but held; not activated | Authoritative Place response plus Guest/Auth identity, submitted method, and cart consumption/recovery semantics |
| Authenticated order retrieval | Supplied documented GET /orders/{order_number}; existing server-held bearer context | Result page checks exact order identity and authoritative order/payment evidence | Current production payload/status combinations |
| Guest lookup | Supplied documented paid response and independently successful real post-payment lookup | Result page uses saved phone as a lookup hint; server checks returned identity | Recovery after identity/session loss remains manual QA |
| Hosted destination | Existing approved Tap destination validator | HTTPS, exact checkout hostname, no credentials/custom ports, required charge ID and usable expiry; URL never proves payment | Other provider hosts or new methods are not authorized |
| Payment return | User-approved frontend contract; Laravel redirect not yet deployed | Localized result route with status=success\|failed and original order_number; backend read determines result | Laravel deployment and sandbox smoke test |

The user supplied the relevant backend contract evidence directly; no collection
access is needed. The backend developer confirmed a shared hosted lifecycle for
supported methods, but this does not establish exact direct hosted Place fields,
identity applicability, or method-specific OTP requirements. That specific branch
remains blocked pending an authoritative response example, not a Postman export.
No production API was called to fill evidence gaps.

The supplied Verify endpoint reference is `/orders/{orderNumber}/verify`, whereas
the existing working adapter uses `/checkout/orders/{orderNumber}/verify`. The
tested integration path is preserved; this review does not guess an endpoint
migration or alias from the differing reference.

## Decision ownership

- Place normalization and mapping retain existing verification-required and
  confirmed outcomes; unsupported or contradictory results remain recovery cases.
- Verify's hosted continuation intentionally precedes Place normalization. The
  confirmed Verify response may retain pending_verification after the OTP flag
  clears. Applying Place's pre-verification rules to it caused the previously
  fixed 502. That fix is retained; no further rule consolidation is justified by
  a newly confirmed defect.
- The hosted outcome reuses the existing URL validator and handoff. It does not
  represent paid payment, confirmed order, or another OTP request.
- Result classification reads Laravel state, never the query status or a saved
  hosted URL. Paid, failed, pending/unknown, unavailable and invalid returns remain
  distinct. Refresh and explicit recheck perform reads only.
- Legacy order confirmation without payment data remains an order-received
  receipt, not evidence of paid payment.

## Method integrity

Only Card/Mada is submit-capable. Its selected value matches the fixed Card
serializer and the UI explicitly identifies it as the submitted method even
when discovery cannot display it.
Apple Pay, bank transfer and standalone Tap remain disabled even if discovered.
The Phase 2 review removed the unconfirmed mandatory discovery guard. A successful
discovery response establishes a response shape, not Place authorization. Loading,
unavailable, empty or Card-omitting discovery does not independently block Card.
All existing quote, city, shipping, buyer, gift and duplicate-submission guards
remain. Laravel determines final method acceptance. Discovery failures remain
visible as non-blocking notices.
The parent snapshot state, child synchronization effect and Promise-reference
guard were removed. Promise replacement, Suspense resolution and child remount
cannot alter submission eligibility or enable an unsupported selected method.
Tests now assert the explicit presentation-only policy, exact Card serialization,
and unchanged duplicate/identity/payment guards rather than the superseded rule.
Unknown method codes do not enable checkout capabilities. Expanding selection
requires confirmed submission and outcome contracts together. Laravel remains
authoritative for final eligibility and payment state at submission time.

## Local browser verification

`tests/e2e/checkout-payment-flow.spec.ts` requires `PAYMENT_FLOW_E2E=1`. The existing
loopback fixture server then accepts only scoped synthetic Place/Verify scenarios.
Without the opt-in its payment mutations remain rejected. Provider navigation is
fulfilled inside Playwright; it never reaches Tap. Authenticated immediate-paid
coverage exercises an existing code branch and explicitly does not establish its
live contract. Direct hosted Place remains unimplemented and is not mocked as a
working feature.

Run a production fixture build with the environment described in PAYMENT_RESULT.md,
then set `MAP_E2E_PRODUCTION=1` and `PAYMENT_FLOW_E2E=1` in the test shell and run
both `checkout-payment-flow.spec.ts` and `payment-result.spec.ts`. The result suite
checks mutation absence per test so earlier synthetic checkout tests cannot
contaminate its request history. No existing result assertion is removed.

Validation for the Phase 2 correction: focused payment and Checkout/city regression
tests, standalone TypeScript, ESLint, production fixture build and
`git diff --check` passed.
Chromium passed all 41 scenarios (15 checkout-flow and 26 result-page tests),
including both locales, Guest/Auth reads and mobile/desktop result layouts.
The Windows fixture process hung during teardown after the test worker exited;
stopping only that run's known Next child let Playwright finish with exit code 0.
No assertion or application behavior was changed to accommodate cleanup.

The Phase 2 correction restores presentation-only discovery and the matching
Arabic/English notices. The confirmed Guest Verify fix is preserved. The
uncontracted direct hosted Place branch stays gated rather than being described
as implemented.

## Remaining release checks

- Obtain authoritative Guest/Auth Place examples before enabling direct hosted
  continuation or any additional method. Do not add guessed retry/resend APIs.
- Deploy Laravel's existing agreed redirect, preserving locale and original order
  reference; verify paid, failed and delayed-state sandbox returns.
- Test same-tab/new-tab return, storage restrictions, expired handoff, browser Back,
  network loss and expired authentication on physical iOS/Android and desktop.
- Verify Arabic/English keyboard, touch and screen-reader recovery. Incomplete
  profile routing and lost identity currently recover through existing account,
  tracking or support paths; seamless return restoration is not claimed.
