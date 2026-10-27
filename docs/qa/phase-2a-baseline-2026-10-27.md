# Phase 2A — production baseline and test diagnostics

**Date:** 27 October 2026 (Africa/Cairo). **Decision:** the application builds and
the production fixture suite passes, but the **default E2E baseline is FAIL**.
Do not certify the default runner as stable or start Phase 2B from this report alone.

This was a read-only application audit. Only this new report and its evidence
directory were added. No application, test, dependency, configuration, business,
authentication, checkout or payment files were changed. No commits, resets,
clean/stash operations, live payments or real order mutations were performed.

## 1. Git and Payment status

- Branch: `dev`; HEAD: `8dfab3032f9bff69b4cb36ca8788e60b6b5db3ec`
  (`feat: add payment result page`). Initial tracked, staged and untracked status:
  **clean**. Payment is committed, not pending local work.
- Previous commits include `d7a85a1` (interactive map) and `800d2e6` (hosted payment
  redirect). The committed `browser-test.png` and all previous work were preserved.
- Payment adds `/{locale}/checkout/payment-result`, its shared result view, guest
  lookup island, server projection and result classifier. Cover **checking,
  confirmed, failed, pending, unavailable and invalid** states, long references,
  guest handoff loss, recheck, ownership mismatch and refresh/back navigation.
- Existing [Payment contract](../PAYMENT_RESULT.md) remains unchanged. Backend
  `paid` evidence, not URL `success`, determines confirmation. No new route or
  endpoint was introduced during this diagnostic phase.

## 2. Current route inventory

There are **36 page patterns**, each under both `/ar` and `/en` (72 localized
combinations, before dynamic values). No prior inventory document was found;
this replaces assumptions from the supplied earlier-audit narrative.

| Route after `/{locale}` | Baseline coverage / conditions |
| --- | --- |
| `/` | Public browser matrix |
| `/about` | Source-inspected localized redirect to `/about-us`; browser NOT RUN |
| `/about-us` | Public matrix |
| `/products`, `/products/[slug]` | Public matrix; real existing product below |
| `/categories`, `/categories/[slug]` | Public matrix; `/categories/gifts` |
| `/blog`, `/blog/[slug]` | Public matrix; real existing article below |
| `/offers`, `/search` | Inventory only; NOT RUN in representative matrix |
| `/cart`, `/checkout` | Existing fixture matrix; no real Cart mutation |
| `/checkout/payment-result` | Public invalid state; five fixture result states; existing E2E covers checking/recheck and both identity modes |
| `/orders/[orderNumber]/verify`, `/orders/[orderNumber]/confirmation` | Inventory only; valid live handoffs BLOCKED, no OTP/payment operation attempted |
| `/track-order`, `/contact` | Public form presentation; live submissions NOT RUN |
| `/privacy`, `/returns`, `/shipping`, `/terms` | Terms sampled; other three NOT RUN |
| `/login`, `/login/verify`, `/register` | Login sampled; valid OTP/onboarding states BLOCKED without a safe staged identity |
| `/auth/cart-recovery` | Live authenticated recovery BLOCKED |
| `/account`, `/account/profile`, `/account/settings` | Full live authenticated pages BLOCKED; no real session supplied |
| `/account/addresses` | Synthetic authenticated fixture matrix |
| `/account/orders`, `/account/orders/[orderNumber]` | Result-page authorized read covered; full list/details UI NOT RUN, live customer access BLOCKED |
| `/account/wishlist`, `/account/loyalty` | Full live authenticated state BLOCKED; inventory does not approve additional product scope |
| `/ds-review`, `/foundation-review` | Internal review routes; NOT RUN |

Also tested the **unmatched** `/ar/qa-missing-page` and `/en/qa-missing-page` paths.
Source-defined not-found boundaries exist at locale, static-page, product, blog
and account-order levels. Dynamic not-found variants were not exhaustively tested.
API Route Handlers are transport boundaries, not additional responsive pages.

Highest-impact shared surfaces: locale root layout; storefront and account
layouts; Header/PrimaryNavigation/HeaderActions; category menus; QuickAccessHeader;
announcement; MobileBottomNavigation; Footer; Container; ProductCard/listing grid;
AppImage; AppCarousel; RafalModal; form controls; checkout sections and PaymentResultView.
The root `overflow-x-hidden` means a zero document-scroll overflow reading alone
cannot prove that descendants are not clipped.

## 3. Automated baseline

Environment: Windows PowerShell, Node **24.19.0**, Next **16.3.3**, installed
Playwright **1.64.1**, Chromium **156.0.8078.4**. No package was installed.
`package.json` has `dev`, `build`, `start`, `lint`; no test/typecheck npm script.

| Check and exact command | Status | Exit / result |
| --- | --- | --- |
| `npx.cmd tsc --noEmit` | PASS | 0 |
| `npm.cmd run lint` | PASS | 0 |
| `$testFiles = @(rg --files tests src -g '*.test.mjs'); node --test @testFiles` | PASS | 0; 606 passed, including Checkout/Orders/Payment |
| `npm.cmd run build` | PASS | 0; current configured production build |
| Same build with existing fixture environment below | PASS | 0; isolated `.next-map-e2e` production output |
| Default development E2E command below, sandboxed | **FAIL** | 1; 43 passed, 4 failed, 2 skipped, plus teardown timeout |
| Production fixture E2E command below, outside sandbox | PASS (specified profile only) | 0; 47 passed, 2 skipped; clean automatic exit in 120.1s |
| `git diff --check` | PASS | 0; no tracked source changes |

The installed CLI was invoked directly, without installation or configuration edits:

```powershell
node node_modules/@playwright/test/cli.js test --global-timeout=180000 --reporter=line --output=<QA_TEMP>/dev-results
```

The comparison used the same arguments with `--output=<QA_TEMP>/production-results`
and the repository's documented `MAP_E2E_PRODUCTION=1` switch. Its prior fixture
build used these temporary child-process environment values:

```text
RAFAL_MAP_E2E=1
API_BASE_URL=http://127.0.0.1:3101
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3101
SITE_URL=http://127.0.0.1:3100
NEXT_PUBLIC_LOCATIONIQ_TOKEN=synthetic-mocked-token
USE_MOCK_AUTH=false
USE_MOCK_API=false
```

Both runs captured `DEBUG=pw:webserver,pw:browser` and diagnostic-only PID records.
An outer supervisor imposed a 210s ceiling; neither run reached that outer kill.
No `.env`, Playwright or Next configuration file was edited.
The two skips are the opt-in **live LocationIQ** and **missing-token profile** tests:
both **NOT RUN**, not passed. Existing E2E address writes target only the isolated
synthetic backend. Live provider/payment/account mutation tests were not enabled.

Logs: [Node](evidence/phase-2a-2026-10-27/node-tests.log),
[build](evidence/phase-2a-2026-10-27/build.log),
[default E2E](evidence/phase-2a-2026-10-27/dev-e2e.log),
[production E2E](evidence/phase-2a-2026-10-27/production-e2e.log).

## 4. Runner diagnosis

**Reproduced, evidence-backed, no fix applied.** Default configuration launches
`next dev`. Four Payment tests require `Cache-Control` containing `no-store`, but
development returns `no-cache, must-revalidate`. This is a test-profile mismatch;
the assertions pass against the production fixture build. Assertions were not weakened.

Separately, Chromium logs show `<process did exit: exitCode=0>` and completed
browser cleanup **before** `pw:webserver Terminating the WebServer`. The sandboxed
run then reports `Timed out waiting 180s for the teardown for plugin setup to run`.
The test CLI returns 1, leaving its fixture server processes alive. Only recorded
run-owned Next/fixture PIDs were cleaned up afterward. This was **not a clean pass**.

Installed Playwright `coreBundle.js` uses Windows `taskkill /pid … /T /F` and waits
for process exit. A disposable-process probe reproduced **exit 1 / Access denied /
target still alive** in the sandbox. The same probe outside it returned **0** and
removed its own target. The full production run outside the sandbox logged both
`Terminating` and `Terminated the WebServer` and exited automatically.
Evidence supports restricted Windows process-tree cleanup, not an unclosed Chromium
context or an unresolved payment request, as this run's hang cause.
See [process probe](evidence/phase-2a-2026-10-27/process-probe.json).

## 5. Hydration diagnosis

**FAIL: reproducible development warning.** A fresh Chromium context opening the
Checkout map immediately produced **2 English / 4 Arabic** attribute mismatch
warnings at 390×844. Opening after a diagnostic 2.5s wait produced **zero** hydration
warnings in both languages. No warnings occurred before opening in these probes.

The server's `#checkout-payment` section has no `aria-hidden`/`data-aria-hidden`.
An observation wrapper around native `setAttribute` recorded the additions from
`applyAttributeToOthers → hideOthers → DialogContentModal.useEffect` (Radix).
React's diffs identify Checkout payment and MobileBottomNavigation/background
nodes. This supports a modal-background-hiding versus late/selective-hydration race.
The six separate provider resource errors in each probe were deliberate blocked
map requests, not hydration warnings. The observation wrapper did not change
attribute values or application source.

The delay was a diagnostic comparison, **not a proposed fix**. Do not suppress the
warning, remove background accessibility isolation, or add an arbitrary timeout.
Ten production mocked map viewport probes passed geometry and Escape/focus recovery;
absence of development warnings in production is not proof the race is resolved.
See [hydration evidence](evidence/phase-2a-2026-10-27/hydration-evidence.json).

## 6. Browser coverage and findings

Every matrix scenario used **320×740, 390×844, 768×1024, 1024×768, 1440×900**, in
both Arabic and English, with Chromium and reduced motion.

- **140 public page/viewport visits** against `http://127.0.0.1:3200`, a local
  production build reading the configured public Laravel API. Initial sandbox
  requests were BLOCKED by `EACCES`; running this owned server with network access
  restored HTTP 200 responses. No real authenticated session was used.
- **80 fixture visits** against `http://127.0.0.1:3100`: Checkout, Cart, synthetic
  Address Book, and confirmed/pending/failed/unavailable/invalid Payment states.
- **10 gallery/navigation interactions**: loaded image, modal geometry, Escape
  focus restoration, mobile More or desktop category panel.
- **10 mocked map interactions**: open, select existing fixture city, geometry,
  Escape and restored focus; no address save.

Exact URLs, locale, viewport, technical and visual verdicts, console messages,
observations and screenshot references are in the
[240-row browser matrix](evidence/phase-2a-2026-10-27/browser-matrix.csv).
[Measurements](evidence/phase-2a-2026-10-27/browser-measurements.json) retain geometry.
There are **129 visual PASS / 111 visual FAIL rows**; these are repeated viewport
observations, **not 111 separate defects**. Most failures repeat shared English-page
Arabic content. Technical geometry passes are deliberately separated from visual verdicts.

Dynamic public examples used in both locales:
`/products/soar-fd-klasyky-2`, `/categories/gifts`,
`/blog/personalized-gift-ideas-family-occasions`.

| Finding | Status and evidence |
| --- | --- |
| Generic locale 404 | FAIL at all five sizes: English Next fallback, no `html lang/dir`, including Arabic URL. [390px](evidence/phase-2a-2026-10-27/ar-generic-404-390.png) |
| English storefront announcement | FAIL: hard-coded Arabic at storefront `layout.tsx:84`; affects Payment too |
| English blog/About/product badges | FAIL: anonymous requests with both `Accept-Language: en` and `X-Locale: en` return Arabic samples. Blog/About mappers pass backend text through. Coordinate content/backend ownership; do not invent frontend translations. [API evidence](evidence/phase-2a-2026-10-27/public-data.json) |
| Authenticated tablet header | FAIL at 768px in both languages: About us / من نحن wraps. Anonymous header does not reproduce it. [English](evidence/phase-2a-2026-10-27/en-auth-header-768.png), [Arabic](evidence/phase-2a-2026-10-27/ar-auth-header-768.png) |
| Catalogue title readability | Existing truncation reproduced; six clipped title candidates on English Products at 768px. ProductCard explicitly uses `truncate`; no page-wide overflow. Design review needed before treating every ellipsis as a defect. [Evidence](evidence/phase-2a-2026-10-27/en-products-768.png) |
| Prior featured-blog clipping | NOT REPRODUCED in current data at any requested size: image bounds end 1px inside article; `object-cover` still crops source content by design. [Tablet](evidence/phase-2a-2026-10-27/ar-blog-768.png) |
| Prior temporary gallery-loading issue | NOT REPRODUCED in this normal-network sample: all 10 primary/lightbox image checks loaded, zero console errors, focus restored. Cold/slow/failing images NOT RUN. [320px](evidence/phase-2a-2026-10-27/ar-gallery-320.png) |
| Payment panel | PASS for tested result geometry/direction and safe recovery at all sizes; English shell announcement remains a separate FAIL. [Arabic confirmed](evidence/phase-2a-2026-10-27/ar-payment-confirmed-320.png), [English failed](evidence/phase-2a-2026-10-27/en-payment-failed-390.png) |

Console accounting: public 404 resource errors are expected HTTP 404 diagnostics,
while their localization remains a defect. Fixture Cart has a 503 from unsupported
recommendations; Address Book has a 404 from unsupported wishlist count; RF-ERROR
deliberately returns lookup 503. These are recorded, not hidden or attributed to
production. Other tested fixture pages had no recorded console warning/error.
RSC prefetch aborts during context closure are not application exceptions.

## 7. Proposed batches — approval required before implementation

| Priority | Batch / shared impact | Acceptance evidence |
| --- | --- | --- |
| P1 — baseline gate | Separate documented dev versus production E2E expectations; supported Windows runner permissions/process ownership. No weaker payment-cache assertion. | Default intended command exits automatically; no fixture processes remain; expected skips explicit |
| P1 — accessibility | Investigate shared Radix/modal background isolation against streamed hydration, including map and other modal consumers | Immediate-opening AR/EN regression captures console; no mismatch; preserve keyboard, focus and background isolation |
| P1 — localization | Generic 404 locale boundary and shared announcement translation ownership | Unknown routes and storefront shells correct in AR/EN at all five sizes |
| P1 — content dependency | Backend/CMS English blog/About/badge delivery; frontend changes only where ownership is proven | English header requests return appropriate localized content; no frontend guessing |
| P2 — shared responsive shell | Authenticated tablet header and category/menu composition, both languages | No unintended wrapping/overlap at 768/1024; mobile navigation preserved |
| P2 — catalogue | Review card/grid title readability and approved truncation treatment | Long localized names at mobile/tablet sizes; no new tokens/breakpoints without design approval |
| P3 — targeted regression | Recheck prior blog/gallery observations under matched content and cold/slow media before proposing fixes | Reproducible failing evidence first; no speculative layout rewrite |

## 8. Limits and handoff

This is a representative baseline, not full accessibility, performance, cross-browser
or visual-regression certification. Physical touch devices, screen readers, zoomed
text, normal-motion comparison, throttled networks and production LCP/CLS were
**NOT RUN**. Real authenticated orders, provider returns and live transactions are
**BLOCKED / intentionally excluded**. Existing safe fixtures do not represent every
production catalogue, payment or account state. Backend content can change.

All app/config/test files remain unchanged. Diagnostic scripts and full screenshots
are retained under `C:\Users\geexar\AppData\Local\Temp\rafal-phase2a-20261027`;
selected durable evidence is beside this report. Owned local servers were stopped
after inspection; unrelated processes were not targeted.

**Stop here. Phase 2B has not started and requires review and approval.**
