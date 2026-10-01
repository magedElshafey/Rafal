# Rafal Motion System

Phase 0 engineering handoff, inspected 2026-10-01 at `5ab4faf` on
`style/rafal-animation`. This document records current code, approved policy,
and future direction separately. Phase 0 changes documentation only.
Read [PROJECT.md](PROJECT.md), [ARCHITECTURE.md](ARCHITECTURE.md),
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), and [AGENTS.md](../AGENTS.md) alongside it.
Future implementations still require their own approved scope and designs.

## 1. Goals

Rafal should feel like a premium modern commerce experience. Motion supports
orientation, feedback, hierarchy, continuity, and a restrained premium feel.
The priority order is correctness, performance, accessibility, UX quality, then
visual polish. Animation is not an end in itself.

## 2. Engineering Principles

- Give each effect a purpose; keep intensity and frequency restrained.
- Use progressive enhancement: useful server-rendered content precedes motion.
- Keep data reads and section composition on the server. Pass server-rendered
  children through narrow client wrappers when browser APIs are needed.
- Start with CSS and native browser APIs. No Motion, Framer Motion, or GSAP is
  installed or imported in the inspected source/lockfile. Adding one requires
  a concrete requirement CSS/native APIs cannot meet and architecture approval.
- Preserve accessibility, mobile usability, and consistent interaction behavior.
- Reuse shared primitives and tokens; do not invent a parallel motion system.

## 3. Performance Philosophy

A small measured cost may be accepted for meaningful UX improvement. Large
regressions for decorative effects are rejected. Measure meaningful batches
against a before baseline with the same route, data, device, network, and cache
conditions. Record the UX benefit and performance difference; no numeric motion
budget or new acceptance threshold is established by this document.

### Existing server decisions

The manifest and installed packages both report Next.js **16.3.3** and React
**19.2.8**. App Router, next-intl, server-first composition, and the approved
feature API -> server/client adapter -> shared HTTP transport remain in place.

- [Home page](../src/app/[locale]/(storefront)/page.tsx) starts
  `getCurrentUser()` before awaiting locale and location, then joins Home and
  user results with `Promise.all`. The `/home` request does not wait for `/me`.
  Its optional-auth read obtains the session token directly, not the user result.
  Page composition still awaits both results; this is overlapping requests,
  not independent streaming of the Hero before user resolution.
- [resolveCurrentLocation](../src/features/location/server/resolve-current-location.ts)
  uses React `cache` around the locale-taking resolver and city catalog read.
  It reads the request cookie through `readGuestCityId`, validates a positive
  safe integer, and returns the matching city or null. This is render/request
  memoization, not a persistent user/location cache. No cross-request server
  user/location cache was found in the inspected path. The browser city-catalog
  query is a separate concern, not the selected user's server location cache.
- Home, Why Rafal, ProductShelf, Shop by Department, Hero, and Header preserve
  server composition. Reveal, AppCarousel, gallery, location controls, and mobile
  navigation use client boundaries for concrete browser behavior.

## 4. Current Motion Tokens

Source: [globals.css](../src/app/globals.css), `:root`.

| Token | Actual value | Current role |
| --- | --- | --- |
| `--motion-duration-fast` | `140ms` | Available fast feedback token |
| `--motion-duration-default` | `220ms` | Available default duration token |
| `--motion-duration-reveal` | `420ms` | Reveal opacity and transform transitions |
| `--motion-distance-reveal` | `1.5rem` | Reveal vertical offset (24px at a 16px root) |
| `--motion-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Reveal ease-out |

Fast/default are defined but currently have no consumers in `src`. Existing
utility transitions do not all use these tokens. These are verified repository
values, not a claim of additional Figma approval.

## 5. Motion Categories

### Section Reveal

One-shot viewport enhancement at group/section level, using opacity and
translateY. Why Rafal is the current Reveal consumer. Do not add card-level
observers by default or replay entrances when scrolling back.

### Hover / Focus

Repeatable CSS feedback with visible keyboard focus. Button and IconButton
already change hover/pressed opacity and disable transitions for reduced motion.
DepartmentCard has a small image hover scale. Enable decorative hover only on
capable inputs where appropriate; never gate functionality behind it.

### Press / Action Feedback

Repeatable, brief feedback; the fast token is available for future scoped work.
Button already preserves its dimensions while loading, disables repeat
activation, sets aria-busy, and disables spinner animation for reduced motion.
No new press animation is approved or implemented here.

### Banner Motion

Planned. Hero decoration must preserve immediate core image/content paint.
Below-fold banner enhancements may use section-level viewport activation with
visible SSR content. No banner animation API or new timing is defined.

### Modal / Dialog

Unified open/close motion is planned. Existing dialogs are functional; their
presence is not evidence of an implemented global surface motion system.

### Drawer / Bottom Sheet

Unified surface motion is planned. Preserve existing dismissal, focus,
scroll containment, and responsive behavior; do not invent a replacement API.

### Carousel Feedback

AppCarousel owns Embla, controls, selection, keyboard direction, and autoplay.
Home below-fold instances defer runtime initialization; see section 8.

### Product Media Interaction

Premium redesign is planned. ProductGallery already has image selection,
thumbnails, a RafalModal lightbox, RTL-aware arrow navigation, and trigger focus
restoration. Zoom, mobile gestures, and restrained desktop pointer/3D effects
belong to future work, not the verified current feature set.

## 6. Reveal Architecture

Source: [reveal.tsx](../src/components/ui/reveal.tsx) and `globals.css`.

1. SSR outputs a div with `motion-reveal`, no prepared state. Base CSS is
   opacity 1 and translateY(0). Content is visible without hydration.
2. On mount, the effect exits if the element or IntersectionObserver is missing,
   or reduced motion is already requested. Content remains visible.
3. An observer uses `rootMargin: "0px"` and `threshold: 0.12`.
4. A non-intersecting notification sets `data-reveal-state="prepared"` once:
   opacity 0 and translateY(1.5rem). An initially intersecting element goes
   directly to visible, so it is not hidden first.
5. An intersecting notification sets `visible`, transitions opacity/transform
   over 420ms, and disconnects. Cleanup also disconnects. Scrolling away/back
   does not replay it during that mount; a new mount creates a new lifecycle.

The callback tests `isIntersecting`, not `intersectionRatio >= 0.12`. Therefore
12% is the configured observer threshold, not a strict minimum visibility gate.
Do not describe this as an exact 12% trigger guarantee.

If JavaScript never runs, content stays visible. There is no recovery timer if
enhancement has already prepared content and execution subsequently fails.
The reduced-motion CSS override makes either state visible with no transform
or transition, including when the preference changes after mount. The effect
itself checks the preference only at setup; it has no media-query listener.

[WhyRafalSection](../src/features/home/components/why-rafal-section.tsx) remains
an async Server Component and passes its heading/list through one Reveal wrapper.
No global scroll listener or per-scroll React state is used.

## 7. Hero / LCP Rules

[HomeHero](../src/features/home/components/home-hero.tsx) currently renders a
static banner with a preloaded Next Image, stable frame geometry, and an optional
link. It is not a carousel and is not wrapped in Reveal.

Never render core Hero/LCP content at opacity 0 pending animation JavaScript or
hydration. Never require an animation library to paint it or defer its resource
for decoration. Preserve image sizing/preload and avoid layout shifts.

Future safe candidates include progressively enhanced text/overlay reveals,
decorative foreground motion, or subtle image settle/transforms, only while
keeping the actual LCP candidate visible and immediately paintable. Text can
also be an LCP candidate; an effect name alone does not make it safe.

## 8. Carousel Rules

Source: [AppCarousel](../src/components/ui/app-carousel.tsx), Home composition,
[ProductShelf](../src/features/home/components/product-shelf.tsx),
[ShopByDepartmentSection](../src/features/home/components/shop-by-department-section.tsx),
and [HomeCategories](../src/features/categories/components/home-categories.tsx).

Home has **seven possible rendered instances**, conditional on available data:

| Instance | Initialization |
| --- | --- |
| Home Categories | Eager (default); autoplay opted in |
| Best Sellers | Deferred ProductShelf |
| Featured | Deferred ProductShelf |
| Latest Products / New Arrivals | Deferred ProductShelf |
| On Discount | Deferred ProductShelf |
| Personalizable | Deferred ProductShelf |
| Shop by Department | Deferred |

Empty sections may omit their carousel. Hero is static; Testimonials is currently
a grid. Do not count either as a carousel.

- `deferUntilNearViewport` defaults to false, preserving eager consumers.
- Deferred roots start inactive. IntersectionObserver with `300px 0px` root
  margin activates them once near the viewport, then disconnects. Missing
  observer support falls back to activation; unmount cleans up observation.
- Slides/content are SSR-rendered. While inactive, the viewport uses
  `overflow-x-auto` with hidden scrollbars and receives no Embla DOM ref.
  Activation attaches that ref and changes overflow to hidden.
- This defers Embla DOM/runtime initialization, not module download or React
  hydration: Embla and autoplay are static imports and the hook still runs.
- Native horizontal overflow exists before enhancement, but the content always
  has `touch-pan-y`. Horizontal touch panning before activation is consequently
  a known policy gap/risk, not a verified fallback on touch devices. Eager
  carousels use overflow-hidden even before hydration; do not claim universal
  no-JavaScript horizontal scrolling for every consumer.
- Active roots handle left/right arrows with RTL semantics only when the root
  itself is the event target. Preserve child controls and touch dragging.
- Reduced-motion preference is subscribed to after activation; unknown preference
  is treated conservatively. Controls jump rather than animate when reduced;
  autoplay starts only when motion is allowed and scrolling is possible. The
  autoplay plugin stops on focus and meaningful interaction.
- Keep Embla and its plugins inside AppCarousel. Features own slide content and
  layout. No competing slider or direct feature-level Embla implementation.

## 9. Modal / Surface Motion

Global motion is **planned**, with no final new API defined. Current inventory:

| Surface | Existing implementation |
| --- | --- |
| RafalModal / InfoDialog / ConfirmDialog | Radix Dialog, responsive mobile sheet / desktop modal, optional returnFocusRef, dismissal controls |
| ProductPurchaseSuccessSheet | RafalModal bottom-sheet variant |
| ProductGallery lightbox | RafalModal with return focus to image trigger |
| CityPickerDialog | Custom dialog, focus loop/restoration, body scroll lock, Escape/backdrop dismissal |
| Mobile More navigation | Native dialog/showModal, close/cancel handling, trigger focus restoration |

These surfaces do not share an implemented entrance/exit animation system.
Future work must preserve accessibility across these distinct lifecycles;
unifying motion does not silently authorize replacing their architecture.
Header is server-composed. Mobile navigation has a server translation wrapper
and a client island for current-route state and its More dialog.

## 10. Product Card Motion

Premium Product Card motion is **planned**. The current shared ProductCard is
presentational, composes media/info and shared controls, and contains no reveal
observer or dedicated card entrance/tilt system. Wishlist/quick-add slots do not
establish a new Quick Add journey. Preserve dimensions, link semantics, focus,
and action availability when a future approved task changes it.

## 11. Mobile / Coarse Pointer Policy

Hover is never required to discover or activate functionality. Simplify or omit
decorative effects for coarse pointers; desktop effects are not automatically
mobile requirements. Preserve tap targets, vertical page scrolling, horizontal
carousel interaction, safe areas, and stable content geometry.

## 12. Accessibility

All non-essential motion must respect prefers-reduced-motion. Preserve keyboard
navigation, logical focus order, focus restoration, semantic DOM order, screen
reader output, and touch interaction. Do not reorder content visually in ways
that contradict reading order. Do not make hidden entrance content a keyboard
trap or conceal a focused control. Dialog animation must preserve accessible
names, modal focus behavior, dismissal rules, and background isolation through
open and close. Existing source coverage is not a substitute for manual QA.

## 13. Performance Guardrails

- Prefer transform and opacity. Animating width, height, top, left, margin, or
  padding needs specific justification; existing exceptions are recorded below.
- Avoid heavy animated filters/blur surfaces, blanket will-change, and unnecessary
  compositor layers. Preserve CLS and existing image/layout dimensions.
- Avoid hydration expansion and dependencies without a concrete unmet need.
- Use IntersectionObserver for viewport entry, not global scroll listeners.
  Do not update React state every scroll or pointermove frame.
- Use group/section reveals; per-product observers require strong justification.
- Preserve below-fold runtime deferral, request memoization, and independent
  server request overlap. Do not add cross-user caches for user/location state.
- Check before/after LCP, CLS, interaction responsiveness, JavaScript cost, and
  main-thread work when the implementation affects them. Measure meaningful
  batches; do not run Lighthouse after every tiny CSS edit.

Existing requestAnimationFrame usage is bounded: AppCarousel schedules an initial
control-state update; AnimatedProductMetric performs a one-shot 600ms DOM text
count-up after intersection (threshold 0.4), with a stable screen-reader value.
Neither is a scroll/pointer React-state loop. The metric checks reduced motion
at setup, not continuously. Source search found no authored global scroll or
pointermove animation listener, blanket will-change, or custom CSS keyframes.
Tailwind spinner/skeleton animations still exist and use reduced-motion guards.

## 14. Manual QA Policy

Every future visual/interactive implementation report must end with
`### Manual QA Needed`, listing exact tests still outstanding. Explicitly say
none when no tests remain; never imply unperformed checks passed. Group relevant
tests as follows, making them specific to the changed feature:

- **Desktop:** entry/exit, hover, resize, and scroll-back one-shot behavior.
- **Mobile:** coarse-pointer taps, vertical scrolling, horizontal swipes before
  and after carousel activation, and sheet safe-area behavior.
- **Keyboard:** Tab/Shift+Tab, focus visibility, arrows, Escape, focus restoration,
  and focus entering any prepared reveal group.
- **RTL:** Arabic reading order, directional controls, drag direction, and layout.
- **Reduced Motion:** preference enabled before load and changed during use;
  visible content, non-animated feedback, and stopped autoplay.
- **Slow network:** no-JavaScript/late hydration, visible Hero and content, and
  usable progressive fallback before enhancement.
- **Performance-sensitive checks:** comparable before/after traces, LCP/CLS,
  interaction latency, main-thread work, and below-fold Embla activation timing.

Phase 0 changes no runtime behavior; its manual QA requirement is none. Known
pre-existing risks below are handoff items for future scoped work.

## 15. Planned Motion / UX Roadmap

These are motion-workstream phases, separate from the product delivery phases
in PROJECT.md. The sequence is approved for planning; nothing here implements
these features or authorizes new APIs/dependencies without their task review.

| Phase | Planned scope |
| --- | --- |
| 1 | City Context Transition + Global Modal / Sheet Motion |
| 2 | Global Carousel UX + Testimonials Carousel |
| 3 | Banner Motion System |
| 4 | Premium Product Card System |
| 5 | Quick Add Journey |
| 6 | Categories Navigation: desktop mega menu; mobile drawer / bottom sheet; keep /categories as a valid fallback, deep-link, and SEO route for now |
| 7 | PDP Gallery Redesign: premium gallery, accessibility, zoom/lightbox, mobile gestures, optional restrained desktop pointer/3D enhancement |

## 16. City Change Context — Future Phase 1

The approved task establishes this business distinction for future UX:

| City-dependent commerce | City-independent content |
| --- | --- |
| Products; prices/availability where applicable; cart; checkout behavior/data | Categories; banners; testimonials; static pages |

Keep stable/static UI visible rather than automatically replacing the entire
site with a full-page skeleton. Show clear global pending feedback and mark
commerce-dependent regions pending. Protect cart/checkout consistency, avoid
mixing old-city and new-city commerce state, and consider backend-led cart
reconciliation when availability or prices change. This classification does not
authorize a new caching layer or invented API reconciliation rules.

Current LocationController selects locally and closes the picker before its
transition persists the city, invokes the persistence callback, and refreshes
the route. StorefrontLocationController invalidates current-cart queries in that
callback. The transition pending flag is not consumed. This is existing behavior,
not the completed future global pending/consistency flow. No change is made here.

## 17. Repository Evidence and Contradiction Check

### Confirmed

- Clean working tree at inspection; branch `style/rafal-animation`, HEAD `5ab4faf`.
- `823b16f` (`feat: optmize carousel`): request-scoped location memoization,
  earlier Home user lookup, six deferred Home carousel instances.
- `6ade8b2` (`feat: start animation foundation`): tokens, Reveal, Why Rafal wrapper.
- `5ab4faf` (`feat: increase animation`): reveal 360ms -> 420ms,
  distance 1rem -> 1.5rem, observer margin 160px -> 0px and threshold 0.12.
- `cff4197` (`feat: add tajwal to local fonts`): local font assets/loading.
- CSS/native motion foundation, visible SSR Reveal and Hero, canonical Embla,
  server composition, eager Categories and six opt-in deferred instances.

### Contradiction / Existing Gaps

- **Strict 12% entry claim:** actual Reveal callback uses isIntersecting, not
  an explicit ratio comparison. Section 6 documents actual behavior.
- **Native touch fallback:** overflow-x-auto exists while deferred, but unconditional
  touch-pan-y restricts horizontal touch panning. Device verification is outstanding;
  do not claim the full intended touch fallback is confirmed.
- **Uniform reduced-motion compliance:** several existing color transitions in
  Checkbox, Header/navigation, and mobile navigation lack explicit motion-reduce
  overrides; account-sidebar's rotating disclosure indicator also lacks one.
  DepartmentCard disables its transition but retains the hover scale endpoint.
  The global Reveal override does not cover unrelated components.
- **Preferred animation properties:** carousel dots transition width/background
  color, and cart free-shipping progress transitions width. Both disable their
  transitions for reduced motion, but are existing layout-property exceptions;
  this audit does not grant new blanket exceptions or change them.
- **Uniform timing:** fast/default tokens exist but older controls use utility
  transitions; current implementation is not fully tokenized motion.

These are reported without production-code fixes in Phase 0. Core server
sequencing, location memoization, and the conditional seven-instance carousel
configuration agree with the intended decisions.

### Unknown / Future Decisions

- Measured before/after performance and real-device touch behavior were not
  established by this source audit; no performance improvement number is claimed.
- Final global modal/sheet motion lifecycle, timings, and API are not designed.
- City-change error/rollback, concurrent changes, reconciliation contracts, and
  checkout consistency need an approved feature task and backend evidence.
- Banner/card/gallery effects, zoom/gesture details, and any future dependency
  need concrete requirements/design approval; roadmap entries do not fill gaps.
- Reveal has no recovery mechanism after a post-preparation JavaScript failure;
  any stronger failure guarantee requires future scoped work.

## 18. Phase 0 Validation Record

Validation on 2026-10-01 after the documentation changes:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed using `npx.cmd tsc --noEmit` |
| `npm run lint` | Passed using `npm.cmd run lint` |
| `npm run build` | Normal `next build` via `npm.cmd run build`: compilation and TypeScript passed; page-data collection failed for /api/products because SITE_URL is missing |
| `git diff --check` | Passed |

The Windows .cmd launchers were used because PowerShell blocked npm.ps1 and
npx.ps1 under its execution policy. No alternative build mode, dependency,
environment-file change, or production-code change was introduced. A complete
build remains unverified until required environment configuration is supplied.
