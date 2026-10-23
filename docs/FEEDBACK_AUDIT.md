# Storefront feedback audit — 2026-10-23

Scope: application-owned validation, errors, confirmations and notifications in the existing Arabic/English storefront. No dependencies, business validation rules, request payloads, session ownership, mutation retries or payment behavior were added or changed.

## Findings

| Area / affected files | Issue | Root cause | Severity | Status |
| --- | --- | --- | --- | --- |
| Shared InputField, PhoneInputField; auth, profile, addresses, contact, checkout, gifts, guest tracking | Fields/buttons moved as validation appeared | Conditional message nodes with no reserved space | High | Intrinsic localized feedback slots implemented |
| OTP, return reason, review rating, personalization, price filters, coupons | Bespoke conditional errors had inconsistent size and geometry | Feedback was composed separately in each control | Medium | Reused FieldFeedback; preserved descriptions/invalid states |
| Auth, guest lookup, buyer/destination, gift editor, coupon/cart, returns, review forms | Stored translated strings could outlive their locale | State held presentation text rather than identifiers | High | Error identifiers/domain failures retained; active copy resolved during render |
| ContactForm | Corrected fields retained old errors until another submit | No input-time clearing | Medium | Clears edited field and form failure without moving focus to another invalid field |
| RafalToaster, rafal-toast | Dark footer-adjacent notices, color-only dots, no warning API or dismiss button | Minimal bottom-center Sonner configuration | High | Light token surface, four distinct icons, top inline-end placement, localized dismissal, safe-area offsets |
| All toast consumers; coupon copy | Duplicates and late old-language notifications; direct Sonner bypass | No common message identity or locale lifetime guard | Medium | Canonical wrapper/hook, stable IDs, old-locale cleanup and stale async suppression |
| HTTP client | Malformed message/code values trusted by TypeScript annotation | Unvalidated error JSON | Medium | Runtime record/string checks; original validation details retained |
| Client API adapter | Omitted locale silently selected Arabic | Default argument | Medium | Locale required; all existing callers already supply it |
| Route error components | Retry buttons cleared error state without re-fetching | Older reset-only convention | High | Next 16.3 retry() used for explicit user recovery |
| Locale-level routes | Unhandled page failures fell through to framework fallback; NotFound was literal English | Missing locale boundary and placeholder 404 | High | Localized ErrorState fallback and 404/home link |
| Guest order lookup | Unexpected promise rejection could escape the form | try/finally without catch | Medium | Localized service failure; pending guard released |
| Contact Laravel validation | Cannot faithfully map undocumented backend fields/reasons | Contact-specific contract remains unavailable | Medium | Kept safe fallback; backend confirmation required |
| Newsletter | Native browser validation language can follow browser settings; no subscription mutation exists | Existing server-compatible GET placeholder | Medium | Scope/contract gap retained; requires approved newsletter behavior, not an invented success message |

## Audit coverage

Searched the entire `src` tree for toast calls, form submissions, validation state, raw error messages, API errors, locale headers, alerts/live regions and literal JSX text. Reviewed the shared HTTP client, client/server adapters, application locale configuration and all five message namespaces in each language. Inspected feature mappings and presentation for:

- Saudi phone/OTP, profile completion, edit profile, auth/cart-merge recovery and account preferences;
- address creation/edit/deletion, city selection and location transitions;
- Contact and the existing newsletter placeholder;
- product personalization, quick add, availability, review reads and review submission;
- Cart mutations, coupons, gift recipients, wrapping and anonymous gifts;
- checkout buyer/destination/shipping, verification, confirmation and payment-failure feedback;
- guest order lookup, order details, cancellation and returns;
- wishlist, category/product/offer listings, search, blog, content and page failures.

Public data/read failures remain feature/page states with recovery; mutations remain contextual feedback or toasts. Existing review success, Contact confirmation, purchase sheets and checkout result screens are preserved. Static `/ds-review` design-reference examples are developer reference content, not translated storefront flows; their specimen labels remain outside this change. `/foundation-review` notification examples now support both locales and all four statuses.

## Implementation decisions

### Localization and transport

`next-intl` and the application locale remain authoritative. Feature namespaces/copy contracts retain feature-specific wording; only notification controls and route fallbacks were added to `Common.feedback`. Error state stores keys, flags or existing domain errors, so translations are resolved on render. Validation helpers remain plain typed functions; no schema/form library was introduced.

`ApiError` remains runtime-neutral. Its HTTP envelope validates string message/code properties and retains `errors` as unknown for feature-owned allowlists. UI never renders the transport message as customer copy. Known field identifiers are mapped locally; unknown backend text is not used as a translation key or compared to infer business meaning. Existing auth, profile, address, Cart, review, return and guest-lookup status semantics remain feature-owned. Requests keep their existing Accept-Language convention, timeout and GET retry policies; mutation retries remain disabled.

Contact-specific Laravel validation and constraint details are still undocumented. The frontend cannot safely invent minimum lengths, field blame, stock/coupon reasons, or return eligibility from arbitrary messages. These cases retain localized feature fallbacks rather than exposing backend strings. Existing development-only review diagnostics remain development-only; production customer output uses safe localized keys.

### Stable validation layout

`FieldFeedback` extends the existing field primitives. A CSS grid overlaps an actual feedback paragraph with invisible, `aria-hidden`, noninteractive copies of possible localized messages. The largest natural wrapped message establishes the block size before validation. This supports Arabic/English text, narrow widths and zoom without fixed heights, truncation, height animation, observers or new client boundaries. InputField/PhoneInputField accept `feedbackMessages`; specialized controls compose the same slot. Helper text is also reserved when supplied.

Callers own the possible messages, IDs, validation rules and announcement timing. Empty slots contain no accessible error text. Field errors remain attached through aria-describedby and aria-invalid. Form-level live regions remain mounted; the slot avoids announcing hidden sizing copies. Contact retains first-invalid focus on submit and does not re-focus while the user corrects fields. Screen-reader and real-device verification is still required; static rendering tests are not proof of spoken announcements.

Trade-off: forms reserve visible whitespace for their longest anticipated feedback. This is deliberate and is sized by the actual localized text, rather than a universal arbitrary field height. New validation alternatives must be included in the caller's reservation list. Unexpectedly longer content can still grow rather than being clipped.

### Notifications

Retained Sonner and extended `rafalToast` with warning, message/status-based IDs, and 5-second success/info versus 8-second error/warning defaults. Explicit operation IDs/durations still override defaults. `useRafalToast` suppresses async completions from a locale that is no longer active; the provider dismisses notices when direction/locale changes. All storefront callers use the hook, including coupon copy.

White/gray surface, gray border/text, existing toast shadow, lg radius, Tajawal typography and semantic status colors come from existing Rafal tokens. Distinct Phosphor/local catalog icons communicate status without relying on color alone. The dismissal control has a 44px target and visible focus. Logical content alignment and dismissal placement mirror with direction. Top-right English/top-left Arabic placement avoids the footer and mobile bottom bar, using safe-area-aware margins. The root-level provider avoids clipping by feature containers; Sonner owns stacking, keyboard handling, pause/dismiss behavior and live announcements. Reduced-motion styling disables toast transitions/animation. Native top-layer dialogs and all storefront sticky-shell combinations still require manual review.

## Verification

Commands use installed Node 24.21.0 explicitly on PATH because the default Node/NPM commands resolve to an unconfigured NVM shim. PowerShell blocks npm.ps1, so npm.cmd runs the same package scripts.

- `npm.cmd run lint`
- `node node_modules/typescript/bin/tsc --noEmit` (there is no package typecheck script)
- `node --test tests/*.test.mjs src/features/products/utils/*.test.mjs src/features/products/components/product-card/*.test.mjs` (existing Node test infrastructure; no package test script)
- `npm.cmd run build`

New tests exercise bilingual namespace/key/interpolation parity, accessibility exclusion of sizing copies, malformed transport envelopes, non-retried POST, toast IDs/durations and stale-locale suppression. Existing regression coverage checks auth, profile, contact, cart/checkout context, products, reviews, orders, returns and forms. Test doubles were updated for the locale-aware toast hook and stable feedback primitive; obsolete source assertions now expect stored error identifiers.

Final results: TypeScript passed; all **351 tests passed**; production build passed (72 static pages, temporary QA route removed); ESLint passed with no reported diagnostics. `git diff --check` passed. Earlier failures from stale component mocks, hidden-helper assertions and missing imports were corrected and the checks re-run. No component/E2E package scripts exist; installed Node tests include component rendering and deterministic mutation simulations.

Browser QA used Chrome and a temporary route composing the actual ContactForm with its real translations, bypassing only the unavailable authenticated storefront shell. The route was removed before the final build. No successful form submission or external mutation was attempted.

| Locale | Width | Scenario | Largest measured field/submit position change |
| --- | --- | --- | --- |
| English | 375px | Five empty-field errors | <0.00004px |
| Arabic | 375px | Five empty-field errors | <0.00004px |
| English / Arabic | 768px | Five empty-field errors | 0px |
| English / Arabic | 1440px | Five empty-field errors | 0px |
| English | 375px | Correct email and clear its error | 0px |

Measurements compared document-relative input, textarea and submit-button bounding rectangles. First-invalid focus was observed; invalid email remained localized; switching from English to Arabic while errors were present reset the route form and showed Arabic copy without lingering English. These are component geometry measurements, **not a zero-CLS claim**: no LayoutShift performance-entry trace was collected.

Toast QA visually confirmed English top-right on desktop and Arabic at the mobile top with 16px margins, correct RTL text/icon/dismiss placement, white surface and wrapped error text. Arabic repeated-error plus warning clicks produced two distinct notices, not three. All four controls and localized dismiss labels were present in the accessibility tree. Not exhaustively browser-tested: duration/pause behavior, keyboard dismissal, all four rendered variants at every width, native-dialog stacking, reduced motion and real-device safe areas. The full checkout/auth/cart mutation journeys remain covered by existing automated tests and require staging browser QA.

## Remaining release checks

- Confirm Contact's backend validation fields/constraints and response envelope with the Laravel owner. Until confirmed, undocumented 422 responses cannot expose detailed field-specific reasons.
- Define newsletter subscription behavior and localization requirements before replacing its native browser validation or claiming subscription success.
- Exercise authenticated/backend-dependent flows against deterministic staging fixtures; local authenticated route reads hit an upstream `fetch failed` / `EACCES` environment failure. No real OTP, contact message, purchase, payment, cancellation or return was submitted during browser QA.
- Test assistive-technology announcements, keyboard dismissal/focus in open dialogs, iOS safe-area/coarse-pointer behavior, reduced motion and all sticky-shell placements. A screenshot does not establish zero CLS or full WCAG conformance.

## Modified files and responsibilities

New functionality: shared intrinsic feedback slot, warning notifications, localized route failure fallback and locale-aware toast lifetime guard. Bug fixes: locale persistence, malformed API envelopes, explicit data recovery, Contact error clearing and OTP focus. Visual improvements: stable field slots and light directional notifications. Refactoring is limited to feedback state/presentation; business validation and mutations are unchanged.

| File | Responsibility |
| --- | --- |
| [docs/DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md) | Document feedback conventions, audit evidence and remaining checks |
| [docs/FEEDBACK_AUDIT.md](../docs/FEEDBACK_AUDIT.md) | Document feedback conventions, audit evidence and remaining checks |
| [src/app/[locale]/(auth)/foundation-review/page.tsx](../src/app/[locale]/(auth)/foundation-review/page.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/(storefront)/(static-pages)/error.tsx](../src/app/[locale]/(storefront)/(static-pages)/error.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/(storefront)/about-us/error.tsx](../src/app/[locale]/(storefront)/about-us/error.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/(storefront)/blog/[slug]/error.tsx](../src/app/[locale]/(storefront)/blog/[slug]/error.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/(storefront)/blog/error.tsx](../src/app/[locale]/(storefront)/blog/error.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/(storefront)/categories/[slug]/error.tsx](../src/app/[locale]/(storefront)/categories/[slug]/error.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/(storefront)/offers/error.tsx](../src/app/[locale]/(storefront)/offers/error.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/(storefront)/products/[slug]/error.tsx](../src/app/[locale]/(storefront)/products/[slug]/error.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/(storefront)/products/error.tsx](../src/app/[locale]/(storefront)/products/error.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/error.tsx](../src/app/[locale]/error.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/layout.tsx](../src/app/[locale]/layout.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/[locale]/not-found.tsx](../src/app/[locale]/not-found.tsx) | Localized fallback, explicit recovery, provider labels or review examples |
| [src/app/globals.css](../src/app/globals.css) | Scoped toast dismissal and reduced-motion styles |
| [src/components/ui/field.tsx](../src/components/ui/field.tsx) | Shared stable feedback, input focus or toast presentation |
| [src/components/ui/input.tsx](../src/components/ui/input.tsx) | Shared stable feedback, input focus or toast presentation |
| [src/components/ui/rafal-toaster.tsx](../src/components/ui/rafal-toaster.tsx) | Shared stable feedback, input focus or toast presentation |
| [src/features/account/profile/components/profile-form.tsx](../src/features/account/profile/components/profile-form.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/addresses/components/address-form.tsx](../src/features/addresses/components/address-form.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/addresses/components/address-page.tsx](../src/features/addresses/components/address-page.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/auth/components/CompleteProfileForm.tsx](../src/features/auth/components/CompleteProfileForm.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/auth/components/EmailEntryForm.tsx](../src/features/auth/components/EmailEntryForm.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/auth/components/OtpInput.tsx](../src/features/auth/components/OtpInput.tsx) | Preserve visible keyboard focus in invalid OTP state |
| [src/features/auth/components/OtpVerificationForm.tsx](../src/features/auth/components/OtpVerificationForm.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/cart/components/cart-coupon.tsx](../src/features/cart/components/cart-coupon.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/cart/components/cart-gift.tsx](../src/features/cart/components/cart-gift.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/cart/components/cart-page.tsx](../src/features/cart/components/cart-page.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/cart/components/gift-recipient-fields.tsx](../src/features/cart/components/gift-recipient-fields.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/checkout/components/checkout-buyer-section.tsx](../src/features/checkout/components/checkout-buyer-section.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/checkout/components/checkout-destination-section.tsx](../src/features/checkout/components/checkout-destination-section.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/checkout/components/checkout-gift-recipient-editor.tsx](../src/features/checkout/components/checkout-gift-recipient-editor.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/checkout/components/checkout-gift-wrap.tsx](../src/features/checkout/components/checkout-gift-wrap.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/checkout/components/checkout-verification-handoff.tsx](../src/features/checkout/components/checkout-verification-handoff.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/content/components/ContactForm.tsx](../src/features/content/components/ContactForm.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/offers/components/copy-coupon-button.tsx](../src/features/offers/components/copy-coupon-button.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/order-returns/components/order-return-action.tsx](../src/features/order-returns/components/order-return-action.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/orders/components/cancel-order-action.tsx](../src/features/orders/components/cancel-order-action.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/orders/components/guest-order-lookup.tsx](../src/features/orders/components/guest-order-lookup.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/products/components/listing/catalogue-product-listing.tsx](../src/features/products/components/listing/catalogue-product-listing.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/products/components/listing/listing-filters.tsx](../src/features/products/components/listing/listing-filters.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/products/components/product-card/product-quick-add-control.tsx](../src/features/products/components/product-card/product-quick-add-control.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/products/components/product-card/product-quick-add-sheet.tsx](../src/features/products/components/product-card/product-quick-add-sheet.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/products/components/product-details/product-purchase-panel.tsx](../src/features/products/components/product-details/product-purchase-panel.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/reviews/components/order-product-review-action.tsx](../src/features/reviews/components/order-product-review-action.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/reviews/components/product-review-rating-input.tsx](../src/features/reviews/components/product-review-rating-input.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/wishlist/components/wishlist-heart.tsx](../src/features/wishlist/components/wishlist-heart.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/features/wishlist/components/wishlist-interactive-grid.tsx](../src/features/wishlist/components/wishlist-interactive-grid.tsx) | Feature feedback localization, stable field regions or canonical toast consumption |
| [src/lib/api/client-api.ts](../src/lib/api/client-api.ts) | Typed locale input or safe HTTP error normalization |
| [src/lib/api/http-client.ts](../src/lib/api/http-client.ts) | Typed locale input or safe HTTP error normalization |
| [src/lib/rafal-toast.tsx](../src/lib/rafal-toast.tsx) | Four notification variants, duplicate IDs and locale guard |
| [src/messages/ar/common.json](../src/messages/ar/common.json) | Localized notification controls, route fallback and review examples |
| [src/messages/en/common.json](../src/messages/en/common.json) | Localized notification controls, route fallback and review examples |
| [tests/feedback.test.mjs](../tests/feedback.test.mjs) | Regression coverage or updated component doubles/feedback assertions |
| [tests/form-controls.test.mjs](../tests/form-controls.test.mjs) | Regression coverage or updated component doubles/feedback assertions |
| [tests/order-returns.test.mjs](../tests/order-returns.test.mjs) | Regression coverage or updated component doubles/feedback assertions |
| [tests/quick-add-option-values.test.mjs](../tests/quick-add-option-values.test.mjs) | Regression coverage or updated component doubles/feedback assertions |


## Senior-review remediation and X-Locale integration ? 2026-10-23

This section supersedes the initial audit's message-based deduplication policy and broad reservation guidance. Earlier browser measurements above describe the earlier implementation, not a rerun of every form after this remediation.

### Validated findings and changes

| Finding | Evidence/root cause | Remediation and files |
| --- | --- | --- |
| Coupon bypasses locale guard | Not reproducible: CopyCouponButton already used useRafalToast | Preserved hook; added a deferred clipboard regression test, plus explicit coupon-operation IDs in `features/offers/components/copy-coupon-button.tsx` |
| Identical text hides independent results | Default `${kind}:${message}` ID treated text as operation identity | `lib/rafal-toast.tsx` delegates default IDs to Sonner; explicit IDs update the same operation. Coupon copying uses `coupon-copy:${code}`. Independent purchases, saves, and wishlist operations remain separate |
| Stale asynchronous notification | Hook already compares captured locale with active document locale | Preserved existing strategy and provider cleanup; tested both language directions, old completion suppression, new active completion and same-locale completion. Global wrapper remains for non-hook callers; its caller owns locale lifetime |
| Unsafe hidden sizing copies | reserve accepted arbitrary ReactNode, allowing interactive markup/duplicate IDs | `components/ui/field.tsx` now accepts readonly strings and filters nonstrings at runtime. `input.tsx` reserves helper text only when it is a string; rich visible helpers render once |
| Excess field whitespace | Unrelated phone/email/order errors were reserved under every field | Narrowed alternatives in CompleteProfileForm, profile-form, guest-order-lookup, checkout-buyer-section and checkout-destination-section; GiftRecipientFields accepts separate phone alternatives used by checkout-gift-recipient-editor |
| Misleading one-line fallback | min-h-4 cannot stabilize a wrapping message | Removed fallback from InputField/PhoneInputField. Validated fields supply their actual possible strings; controls with no validation no longer reserve an arbitrary line |
| Conflicting announcements | role=alert combined with aria-live=polite | FieldFeedback now keeps its caller-requested role mounted and relies on alert's implicit assertive semantics. Empty alert contains no error text; actual updates can be announced. Form alerts use existing font-medium weight, while field errors retain regular weight |
| Missing mandatory X-Locale | Neither backend adapter supplied it; public settings had no locale | Backend adapter changes and explicit locale propagation described below |
| HeadersInit merging | Object spread discarded Headers/tuple semantics and allowed case variants | HTTP core now merges via Headers, preserving default/request override order, JSON/FormData behavior and unrelated headers |

The shared field grid remains because the previous measurements demonstrated stable intrinsic wrapping. Contact, address forms, OTP, review/return dialogs, coupon and checkout form summaries retain their complete known message alternatives. There is no evidence that replacing those with conditional panels or fixed heights would improve stability. Summaries stay adjacent to their owning form/section; field errors stay attached to the relevant control. Existing success screens, review confirmation and transactional page states are preserved.

Density tradeoff: known localized alternatives reserve their longest natural wrapped height. Form-level service failures can still require several lines on mobile; retaining those lines avoids moving the submit control. Narrowing to applicable alternatives reduces unnecessary field space without truncation. New or unexpectedly longer copy must be added to the reservation list; otherwise it grows naturally, so arbitrary future strings cannot be promised zero shift. Rich helper nodes are deliberately not duplicated. No measured zero-CLS or full screen-reader-conformance claim is made.

### Mandatory backend locale contract

- Injection: `src/lib/api/backend-request.ts`, called by the existing `server-api.ts` and `client-api.ts` adapters before `createHttpClient`. The neutral transport has no next-intl, environment, browser or session imports.
- Source: the configured next-intl Locale. Server requests now require an explicit `locale` property; every feature server API passes its existing locale. Client factories receive useLocale-derived locale as before. No ambient getLocale call was added to an adapter or Server Action.
- Validation: routing.locales is the single supported-locale source; adapters reject missing/unsupported runtime values before fetch. Existing route/action trust-boundary hasLocale checks remain. No English-to-Arabic fallback was introduced.
- Precedence: clone caller HeadersInit, then set Accept-Language and X-Locale to active locale. This overwrites all case variants with one effective value. Core then preserves those values while merging transport defaults. Authorization, X-Cart-Token, cancellation, timeout, JSON/multipart bodies, paths and GET-only retry policy remain intact.
- Coverage: about, static content, blog, categories, locations, product/home/search/offer reads through optionalAuthProductRead, auth/profile, addresses, wishlist, cart/coupons/gifts/merge, checkout quote/place/verify, orders/lookup/cancellation, returns, reviews and settings. All 38 server request sites use the adapter; browser-direct backend reads use createClientApi. Server Actions and internal route handlers ultimately use those same feature APIs.
- Exclusions: browser-to-Next `/api/*` hops retain their existing locale inputs and do not acquire X-Locale. Static assets, Next internals and payment/third-party navigation are untouched. Neutral HTTP clients do not inject it; backend adapters reject absolute/external endpoint destinations.
- Cache review: active TanStack keys include locale (blog, categories, cities, catalogue/search/offers, quick-add, wishlist, cart, addresses, checkout). Existing React request-memoized localized readers take locale. Public settings now takes locale through cart, checkout, account addresses and quick-add, so its React cache is partitioned too. No cache/revalidation policy was added. Installed Next 16.3 fetch documentation confirms headers participate in persistent fetch cache identity when that cache is explicitly used.
- Backend deployment conditions: localized public responses must vary by X-Locale (and Accept-Language where it independently influences responses); CDN cache keys must preserve that variation. Browser-direct API CORS must allow X-Locale alongside existing headers on the approved storefront origins and methods. These are backend/CDN configuration tasks, not frontend security relaxations; live response/preflight configuration has not been verified here.

Additional files affected by locale propagation: all feature `serverApi.request` callers, settings API/boundary, quick-add-selection-boundary, and cart/checkout/account-address route pages. `tests/contact-messages.test.mjs` now exercises the real server adapter end-to-end with mocked fetch. Existing transport tests use Headers accessors instead of object-property assumptions. No dependencies or backend business rules changed.

### Remediation verification

Automated results and browser results are recorded separately below. Header tests inspect the actual final fetch options, not a helper's intermediate object: both locales, both adapters, GET/POST/PUT/PATCH/DELETE, all three HeadersInit forms, mixed-case conflicting overrides, bearer/cart preservation, multipart content type, invalid locales, locale changes and internal/external exclusions. Feedback tests cover independent same-text notifications, explicit operation IDs/durations, both directions of locale switching, deferred coupon completion, hidden-node rejection, bilingual key parity and mounted alert semantics. Existing commerce tests remain part of the full suite.

Static rendering and mocked interactions establish DOM contracts and deterministic behavior; they do not establish spoken announcements, device safe areas, modal top-layer placement or complete transactional browser journeys. No real OTP, message, order, payment, cancellation or return was submitted.


Final remediation commands/results (Node 24.21.0 on PATH, npm.cmd for PowerShell):

| Command | Actual result |
| --- | --- |
| `npm.cmd run lint` | Passed, exit 0, no diagnostics |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed, exit 0 |
| `node --test tests/*.test.mjs src/features/products/utils/*.test.mjs src/features/products/components/product-card/*.test.mjs` | 354 passed, 0 failed; final full run 10.7 seconds |
| `npm.cmd run build` | Passed, exit 0; compiled in 112 seconds, TypeScript completed, 72/72 static pages |
| `git diff --check` | Passed; Git emitted existing LF/CRLF normalization notices, no whitespace errors |

Initial remediation test failures were stale plain-object header assertions, missing Headers in a VM test environment, and expectations that empty alerts had no role. Those assertions now check actual normalized headers and empty mounted alert content. Lint's hook-loop warning in the mocked hook test was resolved by naming the test harness binding createScopedToast. TypeScript caught a missing locale parameter on checkout's settings helper; locale now flows explicitly through that helper. Checks were rerun after corrections.

Browser smoke checks used a local production server on port 3001 and the existing `/en/foundation-review` and `/ar/foundation-review` pages. Both locales were visited at 375, 768 and 1440 pixels. At 375px, two identical English error notifications appeared separately; localized dismissal labels were present. Screenshots confirmed light surfaces, wrapped text and mirrored RTL/LTR placement at 375/768px. At 1440px the review controls rendered, but settled toast placement was not captured reliably before expiration, so desktop toast placement remains a manual check for this pass. An Enter dismissal was exercised, but expiration timing prevents attributing disappearance conclusively to that key; keyboard dismissal remains pending. Browser viewport was restored and the agent's local server stopped.

The complete modified form matrix was not rerun in the browser during remediation: normal/invalid/cleared/long-copy states across auth/profile/addresses/gifts/checkout/coupons/reviews/returns remain staging checks. The earlier Contact measurements above are retained as historical evidence only. Backend-dependent journeys were not reattempted after the earlier upstream EACCES failure. Live backend CORS and CDN response variation were not inspected, and no backend deployment change is claimed.

### Release recommendation: APPROVE WITH CONDITIONS

The frontend remediation has passing static checks, transport contract tests, feedback tests, existing commerce regressions and a successful production build. No known mandatory frontend X-Locale path is omitted. Approval is conditional on verifying backend CORS and locale cache variation before deployment, and completing the manual UI/accessibility checks below. This is not an unconditional production-readiness claim.

### Manual QA Needed

- On staging fixtures in Arabic and English at 375/768/1440px, exercise field errors, form failures, correction/clearing and longest translations in auth, profile, address dialogs, gift editors, checkout buyer/destination, coupons, reviews and returns. Check submit-control movement, summary density and modal scrolling; record layout-shift traces if zero CLS is a release requirement.
- With a screen reader, verify field descriptions and exactly understandable form-alert announcements; verify keyboard dismissal/focus restoration, including within native dialogs and with sticky storefront bars.
- Verify toast duration/pause behavior, settled desktop placement, reduced motion, touch/coarse pointers, iOS safe areas and zoom. Test locale switching while mutations are pending.
- Confirm allowed-origin CORS preflight accepts X-Locale for direct-browser backend requests and inspect localized backend/CDN cache responses for correct Vary/cache-key behavior. Verify guest/authenticated commerce flows using non-production fixtures, without real OTP delivery, messages or purchases.
