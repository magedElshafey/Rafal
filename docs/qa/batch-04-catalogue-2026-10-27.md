# Batch 04 — categories and catalogue responsive delivery

2026-10-27. **PASS for the targeted production Chromium checks.** Work stopped
after this batch. No business logic, requests, query parameters, routes,
translations, dependencies, configuration, or PDP files changed.

## Confirmed defects and fixes

- At 768px the 240px sidebar left 448px for a three-column product grid:
  cards were only 138.7px wide. They are now 216px wide in two columns.
  At 1024px, three columns replace four: 212px cards replace 155px cards.
  Four columns remain at 1280px and above. The existing three-column layout
  at 640–767px remains because the sidebar is absent there.
- Catalogue names previously truncated after one line. They now allow two
  lines with a consistent minimum title height and wrapping for long words.
  This treatment is scoped to catalogue grids; shared card defaults remain.
- Category landing cards were fixed at 88px inside 85.3px tracks at 320px.
  Two mobile columns now provide 136px-wide links and captions, with centered
  images. Existing image dimensions and larger-screen column counts remain.
- Filter checkbox/radio labels were only 20px high. Their click areas now have
  a 44px minimum height; radio controls retain their width beside wrapped text.
- Route and pagination skeletons use the same column counts as the catalogue.

The sidebar, native sort control, modal behavior, breadcrumbs, and result counts
already fit the tested layouts. Their logic and design were retained.

## Modified application files

- `src/features/categories/components/categories-list.tsx`
- `src/features/categories/components/category-card.tsx` — optional presentation
  class; home carousel retains its existing defaults.
- `src/features/products/components/listing/catalogue-product-listing.tsx`
- `src/features/products/components/listing/catalogue-listing-loading.tsx`
- `src/features/products/components/listing/product-grid.tsx` — optional skeleton
  class; existing consumers retain their default grid.

The prior PDP work is committed as `83b0152`. It was preserved. No automatic
commit, reset, clean, or stash was performed. Diff review and `git diff --check`
passed; all application changes are presentation classes or optional class props.

## Visual evidence

Comparable screenshots use identical viewports and scroll positions:

| Surface | Before | After |
| --- | --- | --- |
| Arabic products, 768 × 900 | [Before](evidence/catalogue-b04-2026-10-27/listing-before.png) | [After](evidence/catalogue-b04-2026-10-27/listing-after.png) |
| English categories, 320 × 900 | [Before](evidence/catalogue-b04-2026-10-27/categories-before.png) | [After](evidence/catalogue-b04-2026-10-27/categories-after.png) |

## Browser verification

Real headless Playwright Chromium against the local production build, anonymous
guest city 1. Browser writes were blocked. Public catalogue reads and isolated
local fixtures were used; no customer mutations, cart actions, or orders.

**PASS:** `/ar` and `/en`, each with `/categories`, `/categories/gifts`, and
`/products`, at 320×740, 390×844, 768×1024, 1024×768, and 1440×900: 30 cases.
Another 24 cases cover products/categories at 639, 640, 767, 1023, 1279, and
1280px (900px high); the required matrix supplies the 768/1024 counterparts.

The checks inspected descendant bounds as well as page overflow, visible control
contents, title wrapping, column counts, filter target height, and document
direction. No horizontal clipping, overlaps, console errors, or page exceptions
were observed in those cases. IconButton's intentional 44px pseudo-element hit
area was distinguished from visible-content clipping.

**PASS:** both locales at 320/768px: sorting and resulting URL, discount filters,
nested category radios, no-results search, and keyboard product-link navigation.
At mobile width, Tab/Shift+Tab remain within the filter dialog and Escape restores
the opener. Additional normal-motion checks cover native keyboard sorting,
Space on checkboxes, Escape restoration, and invalid price-range presentation.
Home category widths and shared card title defaults were also checked in both
locales. Main matrix/fixture checks used reduced motion.

**PASS:** four isolated fixture cases (both locales, 320/768px) exercise pending
pagination, failed next-page requests preserving existing cards, retry, append,
exhausted pagination, long names, and unavailable-card containment. The temporary
fixture reuses `tests/fixtures/product-33.json`, adding a category, two page IDs,
long localized titles, and unavailable stock on page two. No application mapping
was changed. Deliberate HTTP 400 responses were expected; no page exceptions.

[Results with exact URLs, viewports, and outcomes](evidence/catalogue-b04-2026-10-27/results.json).

## Commands and results

`QA_TEMP = C:\Users\geexar\AppData\Local\Temp\rafal-listing-b04`

| Command | Result / exit |
| --- | --- |
| `npx.cmd tsc --noEmit` | PASS / 0 |
| `npx.cmd eslint src/features/categories/components/categories-list.tsx src/features/categories/components/category-card.tsx src/features/products/components/listing/catalogue-product-listing.tsx src/features/products/components/listing/catalogue-listing-loading.tsx src/features/products/components/listing/product-grid.tsx` | PASS / 0 |
| `node --test tests/category-navigation.test.mjs tests/product-card-media.test.mjs tests/form-controls.test.mjs src/features/products/utils/listing-quick-add.test.mjs` | PASS / 0; 37 tests |
| `npm.cmd run build` | PASS / 0; final production output |
| `node <QA_TEMP>\verify.cjs` | PASS / 0; 54 geometry cases + 4 interaction scenarios |
| `node <QA_TEMP>\states.cjs` | PASS / 0; 4 fixture scenarios |
| `node <QA_TEMP>\extras.cjs` | PASS / 0; 2 keyboard/shared-default scenarios |
| `git diff --check` | PASS / 0 |

Initial diagnostic harness runs failed on selectors, immediate `.check()` state
expectations during asynchronous route updates, and pseudo-element geometry.
Those harness issues were corrected and rerun; repository test assertions were
not changed. Node emitted its existing typeless-module warning.

## Limitations

- The live catalogue has eight products; pagination failure/retry and unavailable
  states were verified using local fixtures, not production mutations.
- Names exceeding two lines remain visually clamped; full link names remain in
  the DOM/accessibility tree.
- Existing Arabic backend badges/promotion copy on English pages remain outside
  this presentation batch.
- Full E2E suite and default development runner: **NOT RUN**. The previously
  documented development-runner failure remains unresolved and is not certified
  as passing. No E2E infrastructure or hydration code changed.
- Authenticated cart/wishlist mutations and real-device browser coverage:
  **NOT TESTED**. No functionality in those areas was changed.

### Manual QA Needed

- On iOS Safari and Android Chrome, check category scrolling, native sorting,
  filter-sheet scrolling/closing, and product-card taps in Arabic and English.
- Check VoiceOver/TalkBack announcements for selected filters, sort values,
  and unavailable cards. Automated Chromium checks do not replace this testing.
