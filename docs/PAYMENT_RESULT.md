# Checkout payment return

Implemented for the approved P0 request, 2026-10-27. This page reports payment
verification; it does not place, verify OTP, charge, retry payment, or cancel an order.

## Laravel redirect contract

Return to `/{locale}/checkout/payment-result` using the existing `ar` / `en`
locale prefixes. The origin is the configured `SITE_URL` origin, never an assumed
production hostname. Preserve the customer's original checkout locale.

Required query parameters:

| Parameter | Accepted value |
| --- | --- |
| `status` | Exactly `success` or `failed` (case sensitive, one value) |
| `order_number` | Original order reference (one value), e.g. `RF-10103` |

Examples, with `${SITE_URL_ORIGIN}` meaning `new URL(process.env.SITE_URL).origin`:

```text
${SITE_URL_ORIGIN}/ar/checkout/payment-result?status=success&order_number=RF-10103
${SITE_URL_ORIGIN}/en/checkout/payment-result?status=failed&order_number=RF-10103
```

Generate either redirect without string-concatenating untrusted query values:

```js
const target = new URL(`/${locale}/checkout/payment-result`, process.env.SITE_URL);
target.searchParams.set('status', status); // validated success | failed
target.searchParams.set('order_number', originalOrderNumber);
```

Laravel must process/verify the Tap return and persist its authoritative order
and payment state before redirecting. Return the original `order_number`, not
`display_number`, a charge ID, a Tap token, phone, email, or provider error.
Use a browser GET redirect (303 after a provider POST), on the same storefront
origin and preferably in the original tab so its existing session handoff remains
available. Do not change the working hosted-checkout handoff.

## Verification and ownership

- Authenticated: the Server Component calls `getCurrentUserOrderDetails`, which
  resolves the existing HttpOnly token and uses `GET /orders/{order_number}`.
  Laravel enforces ownership. The result boundary also requires exact returned
  order-number equality. Only a small `{state, authorized}` result reaches the
  presentation. No order/customer/payment payload is serialized into this page.
- Guest: the client island reads the existing
  `rafal:checkout:verification:{orderNumber}` session handoff. Its saved phone is
  only an input hint, never proof of ownership. The existing browser lookup and
  private `/api/orders/lookup` boundary call Laravel `POST /orders/lookup` with
  `order_number` and `phone`. Laravel still checks the pair; the existing server
  boundary rejects response identity mismatches. No new endpoint or storage is
  introduced. The result page displays no personal details from that response.
- Missing, inaccessible, malformed or mismatched handoff: no guest request is
  sent. Offer `/track-order`, `/contact`, and the store. Guest order details remain
  behind the existing identity lookup; there is no public details URL shortcut.
- The saved OTP expiry is not an authorization grant or a payment expiry. The
  existing lookup contract, rather than OTP replay, governs access after return.
- An authenticated session takes the authenticated path. Failure does not silently
  fall back to a different identity. Account-session recovery and incomplete-profile
  routing retain the existing storefront layout guards.

## Result states

URL status never confirms payment, and unknown URL values never default to success.
The page rejects missing, duplicate, malformed or unsafe required query parameters.
Its URL safety allowlist accepts 1–100 ASCII letters/digits/hyphens/underscores,
starting with a letter or digit; this is not a new backend numbering contract.
Extra query parameters are ignored, never rendered or forwarded to Laravel.

| Backend evidence | Result |
| --- | --- |
| `payment.status=paid`, order `confirmed/processing/shipped/delivered`, no required verification | Payment confirmed, even if URL reported failure |
| `payment.status=failed`, order `new/payment_failed/cancelled`, no required verification or conflicting paid timestamp | Payment not completed |
| Pending/unknown payment or order state, paid with stale `new` order, paid with cancelled/failed order, required OTP, non-paid payment with `paid_at` | Pending; no final outcome inferred |
| No identity, inaccessible order, mismatched identity, malformed response, network/API failure | Verification unavailable with recovery navigation |
| Invalid required URL parameters | Invalid return link; no order lookup |

`paid_at` is not required to accept an otherwise consistent `paid` response. A
failed redirect with no final backend outcome is described as a *reported attempt*,
never as a cancelled order. No order cancellation is inferred or performed.

One guest read runs after hydration. No interval, visibility polling, payment
retry or local cached payment result exists. Explicit recheck reuses lookup;
overlapping clicks are blocked and unmount cancels obsolete browser requests.
Authenticated recheck is a native GET form to the same localized route, so it works
without JavaScript and fetches a new server snapshot. Existing bounded transport
GET retries remain unchanged; guest POST lookup has no automatic retries.
Refresh performs another authorized read. Back navigation never replays a payment
operation; a browser may restore its last rendered snapshot until explicit recheck.

## Privacy, caching and presentation

The route is `force-dynamic`, making both rendering and its server fetches uncached.
Next serves private/no-store responses; the existing guest lookup already returns
`Cache-Control: private, no-store`. Metadata is `noindex, nofollow` and `no-referrer`.
Laravel and any intermediary must also prevent caching of private order responses.
Never include secrets or personal data in the redirect URL; the page cannot undo
browser/history/proxy exposure caused by a sender placing secrets in a URL.

The page uses the existing confirmation-panel geometry, Rafal tokens, icons,
Button variants, Container, locale-aware Link and Arabic/English messages. It adds
no visual tokens, motion or dependencies. A single live status region describes
guest progress and results. Long safe references wrap; no PII or provider error is
displayed. Account-details links are shown only after a matching authorized read.

## Automated validation

Deterministic fixtures use the existing local-only Playwright backend. No live
payment transaction, real order mutation or provider request is part of validation.

```powershell
node --test tests/payment-result.test.mjs
$testFiles = @(rg --files tests src -g '*.test.mjs'); node --test @testFiles
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
git diff --check
```

Run browser checks against a production fixture build so the strict private cache
header assertion is meaningful (Next development mode overrides response caching):

```powershell
$env:RAFAL_MAP_E2E='1'
$env:API_BASE_URL='http://127.0.0.1:3101'
$env:NEXT_PUBLIC_API_BASE_URL='http://127.0.0.1:3101'
$env:SITE_URL='http://127.0.0.1:3100'
$env:NEXT_PUBLIC_LOCATIONIQ_TOKEN='synthetic-mocked-token'
$env:USE_MOCK_AUTH='false'
$env:USE_MOCK_API='false'
npm.cmd run build
$env:MAP_E2E_PRODUCTION='1'
npx.cmd playwright test tests/e2e/payment-result.spec.ts
```

These variables belong to a disposable test shell only, not an environment file.
The existing `RAFAL_MAP_E2E` switch isolates output under `.next-map-e2e`.

The browser suite covers both locales and identity modes; 320/390/1440px layouts;
keyboard focus, reduced motion, private cache headers, refresh/back, stale state,
explicit recheck, invalid input, missing storage, ownership mismatch, API/network
errors, progress and duplicate-read protection. Backend request recording checks
that no Place/Verify/Charge/payment mutations occur. Node coverage exercises actual
Orders parsers, mappers and boundaries as well as result classification.

## Integration questions and manual QA

- Confirm Laravel's configured return origin in each environment and how checkout
  locale is retained through Tap. This task does not change provider configuration.
- Confirm all production order-number characters fit the documented safety
  allowlist. Unsupported formats recover safely rather than reaching the API.
- Confirm production Order Details and Guest Lookup emit the same payment states
  and order status combinations. Unknown/contradictory combinations stay pending;
  no webhook-delay duration or guaranteed settlement time is assumed.
- Confirm phone lookup remains available after Guest OTP/hosted return. The saved
  handoff exists in the current flow, but backend authorization remains decisive.
- Verify the real configured Laravel redirect using an approved test environment
  and provider sandbox, including success/failure and delayed webhook persistence.
  No live financial transaction was authorized or executed for this task.
- On physical iOS/Android and desktop browsers, check same-tab return, browser Back,
  blocked storage/new-tab recovery, touch targets, safe areas, and network loss.
- Check Arabic/English screen-reader announcements and keyboard focus, plus
  production-network layout stability. Automated Chromium geometry and keyboard
  checks do not establish physical-device, screen-reader or production performance.

## Changed files

- `src/app/[locale]/(storefront)/checkout/payment-result/page.tsx`: dynamic route,
  metadata, input parsing, authenticated composition and native GET recheck.
- `src/features/checkout/components/payment-result-view.tsx`: shared result panel.
- `src/features/checkout/components/guest-payment-result.tsx`: saved-identity lookup
  island, cancellation, progress and explicit recheck.
- `src/features/checkout/server/payment-result.ts`: private authenticated projection.
- `src/features/checkout/utils/payment-result.ts`: URL validation and evidence rules.
- `src/features/orders/api/guest-order-lookup.ts`: optional caller-owned AbortSignal.
- `src/messages/ar/common.json`, `src/messages/en/common.json`: result copy.
- `tests/payment-result.test.mjs`, `tests/fixtures/payment-result-order.json`:
  unit/integration coverage and synthetic backend order.
- `tests/e2e/payment-result.spec.ts`, `tests/e2e/server.mjs`: browser scenarios and
  existing local fixture extensions.
- `docs/PAYMENT_RESULT.md`: return contract, verification, tests and handoff notes.

## Recorded validation — 2026-10-27

- Focused Payment Result Node suite: 7 passed.
- Full repository Node suite (including Checkout/Orders regressions): 606 passed.
- TypeScript, ESLint, production build and `git diff --check`: passed.
- Production-mode Chromium: 26 browser scenarios passed. Arabic guest mobile and
  English authenticated desktop screenshots were visually inspected; screenshots
  also cover 320/390/1440px in both locales and identity modes.
- Windows sandbox process-tree shutdown hung after all browser assertions passed;
  stopping only the run's known Next fixture process allowed Playwright to finish
  with exit code 0. No application/test assertion was relaxed for this issue.
- Production Laravel/Tap redirects, physical-device QA and screen-reader QA remain
  outstanding as described above. No live transactions or real order mutations ran.
