# Batch 06 — Final stabilization and delivery gate

**Result:** the stale test is corrected and all requested automated gates pass.
The responsive implementation is ready for a separately approved cleanup.
This is not an unconditional production release sign-off: the English-content
and exposed notifications-route defects below still require resolution or an
explicit delivery exception. No unrelated fixes or cleanup were performed.

## Change and stacking evidence

Started on `style/responsive`, commit `69501e1`, with a clean working tree.
The only modified existing file is `tests/cart-layout.test.mjs`.
This report and its five evidence files are new. Application source, dependencies,
configuration, payment documentation and prior QA evidence are unchanged.

The assertion predated committed Batch 03 (`83b0152`): it allowed only the Cart
stacking selector, although PDP deliberately also raises its isolated `main`
to prevent the footer painting over fixed purchase controls. The test now
requires **exactly both scoped selectors**, retains the isolation assertion and
populated/empty Cart marker checks, and verifies the PDP container marker.
It still rejects an unconditional or additional z-index class.

Chromium confirms the actual CSS behavior in both locales:

| State | Computed `main` z-index | Result |
| --- | --- | --- |
| Populated Cart at 320 and 767px | `10` | PASS |
| Populated Cart at 768 and 1440px | `auto` | PASS |
| Empty Cart at 320 and 768px | `auto`, no Cart marker | PASS |
| PDP at 320, 768 and 1440px | `10`, PDP marker only | PASS |
| Home, Categories, Products, Checkout, Payment Result | `auto`, neither marker | PASS |

All 48 visits retain `isolation: isolate`. Six PDP and four mobile Cart cases
also pass purchase-button hit tests at three vertical points over the footer.
PDP checks first expose the main purchase controls; they do not certify the
known direct-Reviews shortcut discussed below.

## Quality gates

Each full gate ran once. Two distinct build outputs were needed: normal `.next`
for public storefront smoke and the existing `.next-map-e2e` fixture profile.
Neither build was repeated. Full logs remain in
`C:/Users/geexar/AppData/Local/Temp/rafal-stabilization-b06` (`QA_TEMP`).

| Exact command | Outcome | Exit |
| --- | --- | --- |
| `npx.cmd tsc --noEmit` | PASS, full TypeScript | 0 |
| `npm.cmd run lint` | PASS, full ESLint | 0 |
| `$testFiles = @(rg --files tests src -g '*.test.mjs'); node --test @testFiles` | PASS, 44 files; 606 passed, 0 failed, 0 skipped | 0 |
| `npm.cmd run build` | PASS, normal production build | 0 |
| `npm.cmd run build` with fixture environment below | PASS, isolated production fixture build | 0 |
| `node "$QA_TEMP/run-e2e.cjs" production` | PASS, 47 passed, 0 failed, 2 skipped; automatic exit in 111.606s | 0 |
| `node "$QA_TEMP/smoke.cjs"` | PASS, 48 scoped smoke cases | 0 |
| `git diff --check` | PASS | 0 |

Fixture build used process-only environment values, without editing configuration:
`RAFAL_MAP_E2E=1`, `API_BASE_URL=http://127.0.0.1:3101`,
`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3101`,
`SITE_URL=http://127.0.0.1:3100`,
`NEXT_PUBLIC_LOCATIONIQ_TOKEN=synthetic-mocked-token`,
`USE_MOCK_AUTH=false`, `USE_MOCK_API=false`.

The existing bounded supervisor launches
`node node_modules/@playwright/test/cli.js test --global-timeout=180000 --reporter=line --output=<QA_TEMP>/production-results`
with `MAP_E2E_PRODUCTION=1`, neither live nor missing-token opt-in, and an outer
210s deadline. It ran outside the Windows sandbox with the previously verified
process-tree cleanup permissions. Chromium exited 0 and the web server logged
`Terminated the WebServer`; no manual interruption or watchdog kill occurred.
The two skips are the explicitly opt-in live LocationIQ and missing-token tests.
Expected fixture failure scenarios and a `NO_COLOR`/`FORCE_COLOR` environment
warning appear in the log; they are not test failures.

**NOT RUN:** default development E2E, alternate missing-token profile, live provider
profile. The default profile remains a known failure, not a certified pass.
See [gate evidence](evidence/stabilization-b06-2026-10-27/validation.log) and
[complete production E2E log](evidence/stabilization-b06-2026-10-27/production-e2e.log).

## Representative Chromium smoke

Both `/ar` and `/en`, each at **320×740, 768×1024 and 1440×900**:

- Public local production server `http://127.0.0.1:3200`: Home, `/categories`,
  `/products`, `/products/aatr-msk-abyd-2` (White Musk).
- Existing local-only fixture `http://127.0.0.1:3100`: populated `/cart`, guest
  `/checkout`, and authenticated
  `/checkout/payment-result?status=success&order_number=RF-10103`.
- Additional Cart checks: populated at 767px and empty at 320/768px, both locales.

**42 representative visits + 6 scope/boundary cases PASS.** Checked document and
descendant horizontal bounds (excluding intentional carousel/scroll contents),
RTL/LTR, page markers, stacking, expanded Checkout summary and purchase-control
hit testing. Selected narrow-screen screenshots were visually inspected; raw
captures remain in `QA_TEMP`. These checks do not certify every visual state.

No JavaScript exceptions, hydration warnings or attempted browser writes were
recorded. Six authenticated notifications-prefetch 404s and one unsupported
fixture Cart recommendations 503 remain explicitly recorded. The fixture backend
also received three existing server-side `POST /locations/resolve` lookups;
that unconfigured endpoint returned 404, without mutating fixture/customer data.
No order placement, payment initiation or customer mutation was requested.
The full E2E suite separately exercises synthetic map/address/payment scenarios.

[Exact URLs, viewports, errors and measurements](evidence/stabilization-b06-2026-10-27/smoke-results.json);
[reproduction script](evidence/stabilization-b06-2026-10-27/smoke.cjs.txt).
Only owned smoke servers were stopped afterward. Recorded E2E/fixture/browser
and smoke server PIDs were verified absent; unrelated processes were untouched.

## Remaining delivery risks

These are delivery judgments for a bilingual storefront, not new implementation
scope. No issue below was silently fixed or waived.

| Known issue | Classification | Impact and next action |
| --- | --- | --- |
| Arabic announcement/content on English pages | **BLOCKER** for complete bilingual delivery | Hard-coded shell announcement persists and was seen in current smoke. Prior API evidence also establishes Arabic CMS/blog/badge content. Assign shell localization to frontend and English content delivery to backend/content owners (external dependency); verify English responses and pages or obtain an explicit scope exception. |
| Generic localized 404 | **NON-BLOCKER** for the responsive batch | Prior baseline reproduces English Next fallback with missing `lang/dir` on an unknown Arabic URL. Correct the generic locale boundary in a separate routing/localization task. Not re-tested in this smoke matrix. |
| Authenticated notifications 404 | **BLOCKER** for exposed authenticated navigation | Visible destination is configured but no route exists; reproduced in both locales during this run. Product/route owner must deliver the destination or approve deferral/removal in a separate task. |
| Early map/Radix hydration mismatch | **NON-BLOCKER**, tracked accessibility risk | Prior development evidence shows Radix background `aria-hidden` attributes added before late hydration. Production fixture interaction tests pass, but production silence does not prove the race resolved. Follow up with immediate-open, slow-stream and assistive-technology checks; preserve background isolation. |
| Direct PDP Reviews navigation and sticky purchase controls | **NON-BLOCKER** | Earlier evidence shows the shortcut can skip observing the main purchase controls, leaving the sticky bar hidden. The main purchase action remains available. Separate observer/state fix and direct-jump regression needed; ordinary-scroll hit tests here pass. |
| Default development E2E profile | **TEST INFRASTRUCTURE ISSUE** | Known four payment cache-header failures (`no-cache` in dev versus expected production `no-store`) plus sandboxed Windows teardown denial. Keep production fixture profile for this gate; resolve/document dev expectations and runner permissions separately without weakening production assertions. |
| Authenticated/live-device scenarios outside fixtures | **EXTERNAL DEPENDENCY** | Real accounts, shipping/payment providers, physical devices and screen readers require staging access, safe test credentials and device QA. Fixture success is not live-commerce acceptance. |

Historical reproduction details remain in the
[Phase 2A report](phase-2a-baseline-2026-10-27.md),
[Batch 03 report](batch-03-pdp-2026-10-27.md), and
[Batch 05 report](batch-05-storefront-2026-10-27.md).

## Cleanup inventory — no actions taken

[Inventory](evidence/stabilization-b06-2026-10-27/cleanup-inventory.json) covers
the **113 pre-existing QA files (8.83 MB)** plus known responsive temporary
directories and generated outputs. The new Batch 06 report/evidence should be KEEP.

| Classification | Items / policy |
| --- | --- |
| **KEEP** | 59 existing QA files: all six reports, selected screenshots, compact results and evidence for unresolved issues. Also retain pre-existing `test-results/` payment captures: responsive-only provenance was not established. |
| **ARCHIVE** | 54 existing QA raw logs, measurements and diagnostic script copies; temporary reproduction scripts/logs/traces from the eight named responsive directories. Preserve report links before moving anything. Three byte-identical script pairs in Batch 01/02 are noted for consolidation review. |
| **DELETE CANDIDATE** | Temporary raw screenshot sets only after verifying retained evidence; regenerable `.next-map-e2e/` after servers stop and cleanup is approved. These are candidates, not permission to delete entire directories. |

Production source, functional tests, configuration, payment/architecture documents,
public image assets and unrelated artifacts are excluded from cleanup candidates.
No files were deleted, moved, reset, stashed or committed.

### Manual QA Needed

- Resolve or explicitly accept the English-content and authenticated notifications
  delivery blockers before unrestricted production sign-off.
- On authorized staging accounts, verify real Cart/Checkout/payment return and
  account flows using approved test transactions; no live transactions were run here.
- On iOS Safari and Android Chrome, verify AR/EN safe-area purchase controls,
  carousel touch interaction and navigation at mobile/tablet widths.
- With VoiceOver/TalkBack, text zoom and normal/reduced motion, verify menu/dialog
  focus, early map opening during slow hydration, and payment announcements.
- Reproduce the direct Reviews shortcut separately; its sticky-state behavior is
  not resolved by the presentation batches.

Stopped after Batch 06. Cleanup requires separate approval.
