# Batch 05 — storefront and commerce presentation

2026-10-27. Five presentation fixes delivered. Targeted Chromium verification,
TypeScript, focused ESLint, and production build pass. **Node tests: 70 passed,
1 pre-existing failure; the overall Node test baseline is not clean.**

## Confirmed fixes and exact files

| Surface | Evidence and fix | File |
| --- | --- | --- |
| Home product shelves | Real long names truncated early in 160px cards. Allow two lines with consistent title height, scoped to home shelves. | `src/features/home/components/product-shelf.tsx` |
| Cart | At 320px, quantity buttons shrank to 33.9px AR / 36.6px EN. Keep their 44px width and let the price/action row wrap. | `src/features/cart/components/cart-page.tsx` |
| Address book | The serviceability badge squeezed recipient details; a phone number split across lines. Let the header wrap and keep the formatted phone together. | `src/features/addresses/components/address-card.tsx` |
| Orders | At 320px EN, the keyboard-focused Cancelled filter extended to x=348.8 behind the scrollport ending at x=304. Wrap filters so every option and focus outline remains visible. | `src/features/orders/components/order-filter-navigation.tsx` |
| Blog | Featured image was 398px wide inside a 288px article on mobile, and 501px wide in a roughly 359px tablet grid cell. Explicit full width/minimum width constrains the frame; full-height stretching now applies only to the two-column layout. | `src/features/blog/components/FeaturedArticle.tsx` |

The blog defect is reproducible with current content, although the previous
Phase 2A sample did not reproduce it. Source-image `object-cover` cropping remains
intentional; the fix removes the separate frame overflow.

Other inspected layouts were retained. No handlers, calculations, requests,
validation, auth, payment transitions, routes, query behavior, translations,
dependencies, configuration, PDP, or catalogue components changed.
HEAD at start: `ea3e58a`, clean working tree. Prior batches were preserved.
No reset, clean, stash, or automatic commit was used.

## Key visual evidence

| Surface | Before | After |
| --- | --- | --- |
| Arabic cart item, 320px | [Before](evidence/storefront-b05-2026-10-27/cart-before.png) | [After](evidence/storefront-b05-2026-10-27/cart-after.png) |
| English featured blog, 768×1024 | [Before](evidence/storefront-b05-2026-10-27/blog-before.png) | [After](evidence/storefront-b05-2026-10-27/blog-after.png) |
| English order filters, 320×740 | [Before](evidence/storefront-b05-2026-10-27/orders-before.png) | [After](evidence/storefront-b05-2026-10-27/orders-after.png) |

## Browser results

Real Playwright Chromium with production output; both Arabic RTL and English LTR.
Public pages used read-only configured catalogue/content reads at port 3200.
Protected commerce/account pages used local fixtures at port 3100, based on the
existing E2E server and order snapshot, with synthetic sessions. Browser mutations
were blocked; the checking-state order lookup was fulfilled locally.

- **PASS:** all five modified routes at 320×740, 390×844, 768×1024, 1024×768,
  and 1440×900. Home/blog/cart/addresses are covered by the 62-case matrix;
  orders by ten cases in the state checks. The matrix also covers guest Checkout
  at all five sizes and Blog/Cart boundaries at 639, 640, and 767px.
- **PASS:** final-build narrow smoke for Home, Blog, Cart, Addresses, Checkout
  in both locales (10 cases). Cart fixed CTA remains reachable above navigation
  when scrolled to the footer. Quantity controls remain 44px wide.
- **PASS:** home carousel keyboard direction; last horizontally scrolling home
  category filter reachable; search suggestions, ArrowDown, Escape/focus;
  address edit dialog Tab/Shift+Tab containment and Escape restoration;
  delete confirmation cancelled without deletion. Four interaction scenarios,
  also rerun on the final build.
- **PASS:** 40 state scenarios include all six Payment Result states at 320px
  in both locales: checking, confirmed, pending, failed, unavailable, invalid.
  They also cover login, three-digit OTP entry without submission, incomplete
  registration, profile/settings, empty wishlist/loyalty, orders, order details,
  and saved-address Checkout. Order filters were reached using actual Tab keys.
- No new page exceptions or hydration warnings attributable to these changes.
  Known console failures are retained in the evidence, not treated as clean logs.

[Exact URLs, viewports, metrics, outcomes, and console records](evidence/storefront-b05-2026-10-27/results.json).
Intentional carousel/scroll-row overflow was checked through keyboard access,
separately from unintended frame clipping. Tests used reduced motion.

## Checks

| Command | Result / exit |
| --- | --- |
| `npx.cmd tsc --noEmit` | PASS / 0 |
| `npx.cmd eslint src/features/addresses/components/address-card.tsx src/features/blog/components/FeaturedArticle.tsx src/features/cart/components/cart-page.tsx src/features/home/components/product-shelf.tsx src/features/orders/components/order-filter-navigation.tsx` | PASS / 0 |
| `node --test tests/cart-layout.test.mjs tests/cart-checkout-context.test.mjs tests/home-new-arrivals.test.mjs tests/product-card-media.test.mjs tests/address-map-forms.test.mjs tests/storefront-polish.test.mjs` | FAIL / 1; 48 passed, 1 failed |
| `node --test tests/orders-filters-timeline.test.mjs` | PASS / 0; 22 passed |
| `npm.cmd run build` | PASS / 0; final build |
| `node <QA_TEMP>/verify.cjs` | PASS / 0; 62 cases + 4 interactions |
| `$env:FINAL_SMOKE='1'; node <QA_TEMP>/verify.cjs` | PASS / 0; final 10 cases + 4 interactions |
| `node <QA_TEMP>/states.cjs` | PASS / 0; final 40 cases |
| `git diff --check` | PASS / 0 |

`QA_TEMP = C:/Users/geexar/AppData/Local/Temp/rafal-storefront-b05`.
The failing test is `checkout stacking adjustment is scoped to mobile Cart and
preserves main isolation` at `tests/cart-layout.test.mjs:84`. It expects only
the cart stacking class, but committed Batch 03 also added
`has-[[data-product-page]]:z-10`. `git show HEAD:.../layout.tsx` confirms that class
predates this batch; the layout and assertion were not changed.

## Known issues and limits

- **Existing functional issue:** the authenticated header links/prefetches
  `/ar/notifications` and `/en/notifications`, which return 404. No route change
  was made. This explains the recorded authenticated-page 404 console messages.
- **Intentionally blocked:** authenticated Checkout quote POSTs; no successful
  quote/shipping recalculation, order submission, payment initiation, profile
  save, address save/delete, cart mutation, or real authentication was attempted.
  Quote failure presentation was inspected; `ERR_FAILED` from the blocked POST
  is recorded separately from page exceptions.
- **NOT TESTED:** populated loyalty history and wishlist, every shipping/payment
  provider option, and live customer states. Fixtures cover representative states.
- Existing English-page Arabic announcement/CMS/badge content and generic 404
  localization remain outside the permitted translation/routing scope.
- **NOT RUN:** full E2E suite, reserved for final delivery regression. The known
  default development-runner limitation remains; this batch does not certify it.
- Early diagnostic runs encountered restricted browser network reads and
  scroll-row measurement false positives. Public-read browser checks were rerun
  outside the sandbox; repository assertions were not weakened.

### Manual QA Needed

- On iOS Safari and Android Chrome: cart controls/footer clearance, address
  edit-sheet scrolling, wrapped order filters, and home carousel swiping in AR/EN.
- With normal motion and VoiceOver/TalkBack: carousel navigation, address-dialog
  announcements/focus return, and payment-state announcements. Physical devices
  and screen readers were not exercised by the Chromium checks.

Stopped after Batch 05 for review.
