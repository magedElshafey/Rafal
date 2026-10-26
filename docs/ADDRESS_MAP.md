# Address location picker

## User journey and integration

The optional picker uses the existing Rafal modal: a large desktop dialog and a full-height mobile surface. Choose a backend delivery city, explore the map, review the candidate under the fixed center pin, then explicitly confirm. Confirmation fills eligible district/street draft fields; saving the address remains a separate form action. Back/Escape discards the unconfirmed point. City dropdown changes are ordinary form draft edits and remain selected on closing.

Guest and authenticated one-time Checkout share this picker. Saved-address selection is unchanged. Address Book add/edit and Cart/Checkout gift editors reuse their existing forms and payloads. No map action saves an address, creates an order, changes Cart identity or persists precise coordinates. Names, phones and other address fields are untouched. Manual edits, including deliberate clears, remain protected unless the replacement checkbox is selected. Only validation errors for populated fields are cleared.

Leaflet 1.9.4 remains suitable: mouse/touch dragging, pinch, double-click, keyboard and zoom controls require no new dependency. Directional buttons and draggable markers are removed. The geographic canvas stays LTR inside Arabic RTL UI. Movement immediately invalidates the preview; only settled movement schedules reverse lookup. Review explicitly resolves the initial center. City focusing and resizing do not reverse-geocode. Stale results cannot be confirmed.

## City identity and geographic safeguards

The canonical `/regions` catalog remains authoritative for City IDs. LocationIQ structured forward search receives city name, known region, `countrycodes=sa`, locale, address details and limit five. Candidates must identify a city/town/municipality or administrative boundary with matching city/region and Saudi country evidence. Missing region, conflicting geography, truncated results or multiple distinct matching points prevent automatic focus. Identical duplicate points are deduplicated. Provider strings never select backend IDs.

Credible bounds must contain the center, be ordered, fit the navigation envelope and span at most three degrees. They use fitBounds with padding and maximum zoom 12. Otherwise a validated center uses zoom 12. City changes preserve the map instance and cancel old lookups/previews. Failure retains the current viewport; an unresolved first opening shows a neutral Saudi overview, not a Riyadh fallback. Manual navigation/entry remains available.

Forward requests wait 350 ms idle and start at least 1,050 ms apart per mounted picker. A form-local cache retains at most 16 successful city viewports for five minutes. No persistent/global cache or precise selections are stored; failures are not cached. Reverse requests use the existing debounce/cancellation coordinator, skip duplicate selections, time out after eight seconds and never automatically retry. This is not an account-wide quota limiter.

Navigation bounds [16,34]–[33,56], zoom 6–18, constrain the UI; they are not an exact Saudi polygon. Reverse country evidence is independently checked. Known reverse city/region conflicts block confirmation and preserve fields. Missing evidence does not invent a mismatch. Name comparison normalizes whitespace, case, Arabic diacritics/alef and region suffixes; it is not an alias/transliteration database. Unrecognized aliases may require manual entry or catalog/provider alignment.

## Suggestions and failure states

- District: suburb, neighbourhood, quarter, city_district, then residential.
- Street: road, pedestrian, then footway. An available string house number can prefix a street without duplication.
- Never substitute display names, cities, regions or postcodes for missing details. No fabricated numbers or coordinates enter address payloads.
- Complete, partial, empty Saudi, outside, unknown-country, geographic conflict and provider-error states have distinct localized feedback.
- Partial previews identify manual completion needs; empty Saudi details permit manual continuation. Outside/unknown/conflicting results cannot populate fields.
- Missing token, tile/chunk failure, provider 403/429/timeout and failed city resolution all preserve manual entry.

## Provider and visual decisions

The existing NEXT_PUBLIC_LOCATIONIQ_TOKEN is a public browser token; no environment file was changed. Requests use the runtime-neutral shared HTTP client without Laravel Authorization, Cart tokens or credentials. Bodyless GETs do not acquire Content-Type. Endpoints remain eu1.locationiq.com/v1/search, /v1/reverse and the existing LocationIQ streets raster tile endpoint. No proxy, new backend route, geolocation permission or fallback provider is introduced.

LocationIQ offers streets, light and dark raster themes. All three public Riyadh tile samples returned HTTP 200 and were visually inspected. Streets retained readable district labels and a stronger road hierarchy; light and dark samples lacked those labels at the reviewed zoom. Streets therefore remains selected; no vector engine is needed. Raster labels may remain English; the UI and geocoding language follow the locale. LocationIQ/OpenStreetMap attribution remains visible. Check deployed token referrer restrictions, current account quotas and caching/attribution permissions with the provider.

References: [structured search](https://docs.locationiq.com/reference/search-structured), [forward search](https://docs.locationiq.com/docs/search-forward-geocoding), [maps/themes](https://docs.locationiq.com/docs/maps), [reverse schema](https://docs.locationiq.com/reference/reverse-api).

## Rendering and accessibility

The canvas dynamically imports Leaflet only on opening. One map survives city switching and normal form renders. Closing cleans up listeners, ResizeObserver, timers and requests. Map animations/inertia are disabled; no React state updates run per drag frame. The shared modal supplies labeling, focus trapping, Escape and restoration. Its optional bodyClassName permits flexible layout without changing other consumers. Confirmation does not overlap preview content. Short viewports can scroll to reach actions.

Keyboard arrows/+/- and labeled 44px zoom buttons supplement gestures. Manual entry never requires the map. Polite statuses announce lookup changes. Browser tests cover RTL/LTR, reduced motion, mobile emulation and focus restoration. Emulation is not physical-device or screen-reader verification.

## Changed files

- src/features/addresses/api/address-geocoding.client.ts: city lookup and conflict checking.
- src/features/addresses/types/address-map.types.ts: city/viewport types.
- src/features/addresses/components/address-map-picker.tsx: modal, cache, preview and confirmation.
- src/features/addresses/components/address-map-canvas.tsx and .module.css: center pin, natural gestures, flexible layout.
- src/components/ui/rafal-modal.tsx: optional body layout class.
- src/features/addresses/components/address-form.tsx; src/features/checkout/components/checkout-destination-section.tsx; src/features/cart/components/gift-recipient-fields.tsx: controlled draft integration.
- src/messages/ar/common.json and src/messages/en/common.json: localized feedback.
- tests/address-map.test.mjs; tests/e2e/address-map*.spec.ts; tests/e2e/server.mjs: provider and browser regression coverage.
- docs/ADDRESS_MAP.md. No dependencies added. Payment, OTP, authentication and Laravel payload contracts remain unchanged.

## Checks and artifacts

Run Node tests with `node --test tests/*.test.mjs`, focused tests with `node --test tests/address-map.test.mjs tests/address-map-forms.test.mjs`, then `npx tsc --noEmit`, `npm run lint`, `npm run build` and `git diff --check`.

Browser suite: `npx playwright test tests/e2e/address-map.spec.ts`. Run address-map-unavailable.spec.ts with MAP_E2E_NO_TOKEN=1, and address-map-live.spec.ts only with authorized MAP_E2E_LIVE=1. Unset each variable after its run. The isolated storefront/backend use ports 3100/3101; port 3000 is untouched. Commerce fixtures are synthetic; real Place/Verify requests are forbidden. Default provider calls/tiles are mocked. Live tests disable network traces, video and automatic screenshots to avoid exposing token-bearing URLs.

Sanitized layout screenshots are retained locally in ignored playwright-report/address-map: desktop-en-preview.png, desktop-ar-preview.png, mobile-picker.png, selected-Riyadh.png, selected-Jeddah.png, partial-preview.png and provider-error.png. Blank mocked tiles establish layout, not cartographic coverage. live-public-riyadh-map.png separately captures actual provider tiles at a public city location, with no form or token-bearing network UI.

The full Node suite passed 571 tests, including Checkout/Cart and existing address-form regressions; focused map/form tests passed 34. Final production browser suite: 21/21 passed. Missing-token browser test: 1/1 passed. Live Riyadh browser test: 1/1 passed with HTTP 200, actual suggestions applied only on confirmation, protected manual edits and no Content-Type/Auth/Cart-token header. TypeScript, ESLint, production builds and diff check passed. Public forward city probes returned HTTP 200 and unique matching city/region evidence for Riyadh, Jeddah and Dammam; this does not prove every catalog alias resolves.

Production verification uses the same fixture server with MAP_E2E_PRODUCTION=1 after building with RAFAL_MAP_E2E=1, local API/site URLs and a synthetic public token. The Leaflet-containing chunk measured 151,584 uncompressed bytes. Production browser tests inspect script content to prove the implementation is absent before activation and present afterwards; both locales passed. Resizing preserves the candidate center even when preview content changes canvas height.

### Manual QA Needed

Physical iOS/Android gestures, VoiceOver/TalkBack/NVDA announcements, actual browser 200% zoom, orientation and deployed token restrictions need manual QA. Strict name matching intentionally falls back for unsupported aliases. Opening an existing Radix modal while streamed Checkout sections are still hydrating can cause aria-hidden hydration warnings; this shared modal/streaming interaction was also observed before the redesign and is not suppressed. No numerical LCP/CLS improvement or comprehensive Saudi street coverage is claimed.
