# Optional address map

Implemented with Leaflet 1.9.4, an imperative client-only canvas, and direct browser LocationIQ requests. Manual forms remain authoritative. No coordinates, provider identifiers, names or contact details are added to Laravel requests.

## Integrated surfaces

- `/[locale]/account/addresses`: add and edit through `AddressForm`.
- `/[locale]/checkout`: Guest and authenticated one-time addresses through `OneTimeAddressForm`; saved-address selection is unchanged.
- `/[locale]/cart`: gift recipient through `GiftRecipientFields`.
- `/[locale]/checkout`: gift recipient editor reuses those same fields.

Existing values and manually changed fields (including deliberate clears) are protected. The visible replacement action can explicitly replace only the shown district/street suggestions. Names, phones, labels, gift messages and default flags are untouched. A city change cancels and invalidates pending suggestions. The latest committed callback supplies the current form draft; guard bookkeeping runs outside React's replayable state updaters.

No trustworthy geographic City-ID mapping exists in the current contract. City selection is always manual; map text never changes a City ID or the browsing-city context. Duplicate catalog names include the region when available. Outside-Saudi results are ignored; incomplete Saudi results remain partial suggestions. No building number is invented. Saved addresses are not forward-geocoded or assigned invented markers.

## Provider configuration and rollout

Set `NEXT_PUBLIC_LOCATIONIQ_TOKEN` to a **public browser token** in the deployment environment and rebuild. Do not use a secret/server credential. `.env.example` documents the name; `.env.local` was not changed. Without a token, opening the picker displays a localized unavailable message and manual entry/save still works.

Restrict the token to the exact approved production/staging referrers in the LocationIQ dashboard. Use a separate approved development restriction if needed; never leave the production token unrestricted. Verify the deployed Referrer-Policy still permits the required origin information. These are provider-side settings, not something this repository can enforce. See [LocationIQ maps/public tokens](https://docs.locationiq.com/docs/maps) and [referrer restrictions](https://help.locationiq.com/support/solutions/articles/36000216422-why-am-i-getting-the-access-restricted-error-).

Raster tiles use `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png`; reverse geocoding uses `https://eu1.locationiq.com/v1/reverse`. Reverse requests send the public token, coordinates, format, address-details flag and current locale only, through the neutral HTTP client with no Laravel auth/Cart headers. See [reverse-geocoding contract](https://docs.locationiq.com/docs/reverse-geocoding).

Keep visible LocationIQ and OpenStreetMap attribution. Raster labels may remain English; surrounding UI and reverse lookup language are localized. Confirm account entitlement, current quotas and attribution requirements before rollout. Requests debounce for 350 ms, start at least 1,050 ms apart per mounted picker, skip unchanged selections, cancel obsolete requests, time out after 8 seconds, and do not retry automatically. This is not a global account quota limiter. There is no persistent response cache or tile proxy; normal browser/provider cache headers apply. HTTP 429 falls back to manual entry. No public OSM/Nominatim fallback is configured.

No geolocation permission or API is used. No real Laravel mutations were executed during testing. Authorized public-location provider sampling was added on 2026-10-27; findings and remaining limitations are below.

## Saudi navigation and autofill correction (2026-10-27)

Confirmed live evidence: the old default center returned HTTP 200 with only `locality`, `city`, `state`, `country`, and `country_code`. None supplies a trustworthy district or street. A separate remote Saudi sample likewise returned only broad administrative fields. Urban Riyadh, Jeddah and Dammam samples returned HTTP 200 with a road plus suburb/neighbourhood; those shapes were already supported by the old parser. The empty response at the old center is therefore a provider-detail limitation amplified by the old broad zoom, not a universal form synchronization failure. Additional known parser gaps were unhandled district/path variants; misleading feedback also claimed fields were filled even when protected.

The canvas now starts at a Riyadh overview (zoom 11), with min/max zoom 6/18 and a navigation envelope from southwest `[16, 34]` to northeast `[33, 56]`, with solid drag bounds. This rectangle is a UI navigation limit, **not an exact Saudi border**. Country eligibility comes exclusively from a valid provider `country_code`: `sa` permits suggestions; another code returns outside; missing/invalid country evidence returns unknown and applies nothing. The selected backend City ID never supplies guessed coordinates. Directional pan buttons allow touch/keyboard navigation while single-finger map panning stays disabled to preserve page scrolling. The geographic canvas and direction buttons remain LTR under either page locale.

Deterministic parsing rules:

- District: first valid `suburb`, `neighbourhood`, `quarter`, `city_district`, then `residential`.
- Street: first valid `road`, `pedestrian`, then `footway`.
- A string `house_number` prefixes an available street/path, unless already present as a separated token. A house number alone is not turned into a street. Example: road `Test Road` plus number `12` becomes `12 Test Road`.
- Trim and collapse whitespace; reject controls, non-strings and values over 300 characters. If combining house/street exceeds 300 characters, preserve the road alone. No full `display_name`, province, city, region, postcode or country is substituted into address fields.
- Messages distinguish both-field suggestions, partial suggestions, empty Saudi details, outside-Saudi, unknown-country and request failure. Messages describe available suggestions rather than falsely claiming protected fields were overwritten.

Live sample records expose only HTTP status, country classification and field names/types. Fixture values in `tests/fixtures/address-map-provider.json` are synthetic replacements matching the observed structures, not copied customer addresses. All six public-point probes (three cities, remote Saudi, outside Saudi and old default center) returned 200. The opt-in Chromium live-provider test also passed: real Riyadh response, HTTP 200, actual district/street autofill, one marker, unchanged manual City ID and protected manual district on a later lookup. The reverse GET had no Content-Type, Authorization or Cart-token header. This used the configured public token with a fixture-only commerce backend; no real address/order mutation occurred. Jeddah/Dammam were API-schema checks, not browser interaction tests. Limited sampling does not establish comprehensive Saudi street coverage or production token restrictions.

References: [LocationIQ reverse schema](https://docs.locationiq.com/reference/reverse-api) and [Leaflet navigation options](https://leafletjs.com/reference.html). No new endpoint, provider, coordinate persistence, City-ID mapping or dependency was introduced.

## Rendering and accessibility

The map is dynamically imported only when opened, with SSR disabled at the narrow canvas boundary and a fixed-height loading skeleton. One map and one marker live in refs; ordinary form keystrokes preserve the instance. Closing/unmounting removes the map, listeners, resize observer and pending requests. ResizeObserver supports modal resizing. Pointer clicks, marker drag-end and the keyboard-operable center button select a point. Zoom controls, map arrow-key navigation, polite statuses and manual entry are available. The geographic canvas stays LTR inside RTL forms.

Map animations, inertia and scroll-wheel zoom are disabled. Touch devices disable map dragging to preserve vertical page scrolling; selection, pinch zoom, marker dragging and directional/zoom buttons remain available. Screen-reader interpretation, real-device gestures and 200% browser zoom still need manual QA.

Browser evidence: no LocationIQ requests or Leaflet runtime resource before activation; the runtime appears after opening. A small Turbopack async-loader stub is loaded earlier, not the Leaflet implementation. Repeated opening produces one container/marker, and typing preserves the Leaflet instance ID. Production build emitted a separate Leaflet-containing JS chunk (151,119 uncompressed bytes in the initial validated build). No numerical LCP/CLS improvement is claimed. Mock tiles are intentionally blank; screenshots validate layout, not real map cartography.

## Automated checks and reproduction

```powershell
node --test tests/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
git diff --check
npx playwright install chromium
npx playwright test address-map.spec.ts
$env:MAP_E2E_NO_TOKEN='1'
npx playwright test address-map-unavailable.spec.ts
Remove-Item Env:MAP_E2E_NO_TOKEN
# Only with explicit authorization for live LocationIQ traffic:
$env:MAP_E2E_LIVE='1'
npx playwright test address-map-live.spec.ts
Remove-Item Env:MAP_E2E_LIVE
```

The Playwright fixture backend binds only to `127.0.0.1:3101`; its Next server uses port 3100 and `.next-map-e2e`. Both API base URLs are overridden. Normal browser tests block external traffic except deterministic LocationIQ mocks. The explicitly opted-in live test permits real LocationIQ traffic with the configured public token, disables traces/video/screenshots and prints only safe status/header-presence metadata. Its commerce backend remains the local fixture. Place/Verify/payment mutations are rejected by the fixture. No production cookies are used. Tests require free ports and permission to launch/terminate their own processes; Windows sandbox restrictions initially prevented shutdown, so successful runs used an authorized process-capable environment. Existing developer servers are left alone.

Validation for the Saudi-boundary/autofill correction: 564/564 full Node tests passed, including 27 map/form tests. The mocked-provider suite passed 14/14 scenarios, and the live-provider Chromium scenario passed. TypeScript, ESLint and production build passed. Diff whitespace check passed. The separate no-token keyboard/manual-payload scenario passed again (1/1). Unit timeout/error cases use simulated transport failures, not live provider outages. Browser coverage includes bounds/zoom constraints, partial/outside/unknown results, both locales, modal add/edit, both gift surfaces, saved versus one-time selection, stale-city cancellation, touch viewport/reduced-motion preference, no overflow, lazy loading and no mutation from map interaction. Existing Address/Cart/Checkout regression suites cover unchanged serializers and validation.

Files touched by this correction only: `address-geocoding.client.ts`, `address-map.types.ts`, `address-map-picker.tsx`, `address-map-canvas.tsx`, both `common.json` translations, `tests/address-map.test.mjs`, `tests/fixtures/address-map-provider.json`, `tests/e2e/address-map.spec.ts`, `tests/e2e/address-map-live.spec.ts`, `tests/e2e/server.mjs` and this document. Existing form integration/merge logic, HTTP transport and commerce contracts were not changed in this correction.

Observed QA issue: opening the existing Checkout gift modal while other Suspense sections hydrate can produce React warnings about `aria-hidden` attributes on payment/navigation sections. The map scenarios pass; this warning has not been proven to predate this patch and remains a separate investigation item. No payment or modal architecture was changed to hide it.

## File inventory

New feature files:

- `src/features/addresses/components/address-map-picker.tsx`
- `src/features/addresses/components/address-map-canvas.tsx`
- `src/features/addresses/components/address-map-canvas.module.css`
- `src/features/addresses/api/address-geocoding.client.ts`
- `src/features/addresses/types/address-map.types.ts`
- `src/features/addresses/utils/merge-address-suggestion.ts`
- `src/features/location/city-option-label.ts`

Updated integrations/catalog/configuration:

- `src/features/addresses/components/address-form.tsx`
- `src/features/checkout/components/checkout-destination-section.tsx`
- `src/features/cart/components/gift-recipient-fields.tsx`
- `src/components/ui/city-picker-dialog.tsx`
- `src/features/location/api/location-api.client.ts`
- `src/features/location/api/location-api.server.ts`
- `src/features/location/api/regions.ts`
- `src/features/location/types.ts`
- `src/config/client-env.ts`
- `src/messages/ar/common.json`, `src/messages/en/common.json`
- `.env.example`, `.gitignore`, `eslint.config.mjs`, `next.config.ts`
- `package.json`, `package-lock.json`: Leaflet runtime, Leaflet types and Playwright development tooling only.
- `AGENTS.md`: standard Next-generated agent guidance appended by `next dev`.

New verification/documentation:

- `tests/address-map.test.mjs`, `tests/address-map-forms.test.mjs`
- `playwright.config.ts`
- `tests/e2e/server.mjs`, `tests/e2e/tsconfig.json`
- `tests/e2e/address-map.spec.ts`, `tests/e2e/address-map-unavailable.spec.ts`, `tests/e2e/address-map-live.spec.ts`
- `tests/fixtures/address-map-provider.json`
- `docs/ADDRESS_MAP.md`

### Manual QA Needed

1. On approved staging, configure a restricted public token, rebuild, and verify allowed/denied referrers, tiles, attribution, quotas and Arabic/English reverse results at representative Saudi urban/rural/border addresses. Confirm manual City IDs always remain authoritative.
2. Test every integrated surface above: no-map save, provider-unavailable save, existing edit values, intentional clears, replacement, city changes during slow lookup, cancel/reopen, and exact outgoing address fields. Use staging addresses only; order submission is not needed for map QA.
3. On iOS Safari and Android Chrome, verify vertical scrolling over the map, pinch zoom, marker drag, tap precision, modal resizing and the on-screen keyboard. Check desktop Firefox/Safari as well as Chromium.
4. At 200% browser zoom and with keyboard/screen reader only, verify focus trapping/restoration in Address Book and gift modals, announcements, controls, attribution and no clipped content. Verify reduced motion and slow/offline networks.
5. Reproduce/investigate the modal/Suspense hydration warning above; measure production cold-load network, LCP/CLS and first-map-open cost on a representative mobile device.

Payment, OTP, authentication, Cart token lifecycle, automatic mutation retry policy and Laravel payload contracts are unchanged. No commit was created.
