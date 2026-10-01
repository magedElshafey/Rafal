# Rafal Motion System

Phase 0 engineering handoff, inspected 2026-10-01 at `5ab4faf` on
`style/rafal-animation`. This document records current code, approved policy,
and future direction separately. Phase 0 changed documentation only. Phase 1B
now adds shared Radix surface motion (section 9); City Context Transition remains
paused pending the separate Cart/Checkout branch.
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
| `--motion-duration-fast` | `140ms` | Surface/overlay exit |
| `--motion-duration-default` | `220ms` | Surface/overlay entrance |
| `--motion-duration-reveal` | `420ms` | Reveal opacity and transform transitions |
| `--motion-distance-reveal` | `1.5rem` | Reveal vertical offset (24px at a 16px root) |
| `--motion-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Reveal ease-out |
| `--motion-distance-dialog` | `0.5rem` | Desktop dialog vertical offset |
| `--motion-scale-banner` | `1.02`; `1.01` below 40rem or on coarse pointers | Image-only banner settle |

Fast/default and the shared ease-out now drive surface motion. The dialog distance
is the only new Phase 1B token, distinguishing dialog movement from section reveal.
It is an engineering choice authorized by this task, not additional Figma approval.
Older utility transitions do not all use these tokens.

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

Phase 3 implements two explicit Home recipes: CSS-only Hero scale settle and
one-shot below-fold image enhancement. Both reuse the 420ms reveal duration and
ease-out; only a banner scale token is new. See section 7 for lifecycle and scope.

### Modal / Dialog

RafalModal now supplies shared CSS entrance/exit motion. Independent native/custom
surfaces retain their existing lifecycle; see section 9.

### Drawer / Bottom Sheet

RafalModal bottom sheets now share surface motion. Side-drawer integration remains
planned; preserve dismissal, focus, scrolling, and responsive behavior.

### Carousel Feedback

AppCarousel owns Embla, controls, selection, keyboard direction, and autoplay.
Home below-fold instances defer runtime initialization; see section 8.

### Product Media Interaction

ProductGallery uses one selected image, numbered thumbnails, scoped RTL-aware
keyboard navigation and an enlarged RafalModal view. Native thumbnail scrolling
supports touch; primary-image swipe and decorative pointer effects are not
implemented. See section 21 for media, loading and lifecycle rules.

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

[HomeHero](../src/features/home/components/home-hero.tsx) renders a banner with a
preloaded Next Image, stable frame geometry, and an optional link. It remains a
Server Component, is not a carousel, and is not wrapped in Reveal. Its image now
has a CSS-only scale settle under prefers-reduced-motion:no-preference. No image
opacity animation or hidden initial state is used.

Never render core Hero/LCP content at opacity 0 pending animation JavaScript or
hydration. Never require an animation library to paint it or defer its resource
for decoration. Preserve image sizing/preload and avoid layout shifts.

Future safe candidates include progressively enhanced text/overlay reveals,
decorative foreground motion, or subtle image settle/transforms, only while
keeping the actual LCP candidate visible and immediately paintable. Text can
also be an LCP candidate; an effect name alone does not make it safe.

### Phase 3 banner inventory and recipes

| Classification | Surface | Existing image/layout contract retained |
| --- | --- | --- |
| A: LCP-sensitive | HomeHero | One image; Next Image fill/preload, existing sizes, 22/7 aspect ratio, 1320px maximum frame, object-cover, clipped rounded frame |
| B: Home promotional | Men / Gifts / Loyalty via HomePromoBanner | One image each; fill, default lazy loading, existing sizes, object-cover; ratios 1320/403, 1320/424, 1320/335 respectively |
| C: excluded | Announcement strip, About hero, featured blog media, category/department cards, product/collection imagery and skeletons | No automatic banner-motion classes or wrappers |

The Home API supplies image_url, title, link_url, sort_order and position. The
existing mapper assigns hero/men/gifts/loyalty slots and validates links; no data
contract changes are made. No distinct mobile/desktop image assets exist in this
banner DTO. Responsive sizes/srcset remain unchanged; no duplicate images are
introduced. Category/collection pages do not share HomePromoBanner.

**Hero recipe:** scale from the banner token to identity over 420ms, once per CSS
animation run, with no delay, loop, opacity change, IO, or hydration dependency.
The image is paintable from SSR and remains visible if JavaScript never runs.
The CSS animation may finish before a slow image arrives; do not delay image paint
or add a load/hydration replay to make the effect visible. The browser can restart
a CSS animation when the motion-preference media query becomes applicable again;
this is not a scroll-triggered replay or continuous animation.

**Promo recipe:** the narrow Home-owned BannerMotion client wrapper observes one
banner/group and animates only its image: opacity 0.92 -> 1 and scale -> identity
over 420ms. Its default state is fully visible; there is no prepared/hidden state.
This intentionally differs from generic Reveal, which hides/translates the group
and would also affect its interactive wrapper. HomePromoBanner still constructs
its image and link on the server and passes them as children to BannerMotion.

One IntersectionObserver per rendered promo (zero when reduced motion is enabled
at setup or IO is unavailable), zero per child, at most three on a complete Home.
An initial non-intersecting observation arms the enhancement; a later intersecting
notification starts it and disconnects. Initially visible banners skip motion to
avoid late-hydration movement under the reader. Threshold is configured as 0.12;
the callback uses isIntersecting, not a strict 12% visibility gate. Animation end
or cancellation marks the run complete. Focus entering the group also completes
it immediately. Scrolling away/back does not replay it during the same mount;
remounting creates a new lifecycle. Unmount disconnects and removes listeners.

Both recipes are opt-in, scoped image classes under no-preference. Reduced motion
leaves the normal visible, untransformed image with no staged delay. The scale is
smaller (1.01) on coarse pointers or below 40rem. There is no gesture handling,
translation of the link, pointer blocking, nested interactive element, or invented
overlay text. The existing anchor/Link, alt text, focus styles and semantic order
remain intact. Scaling stays inside existing overflow-hidden image frames, while
the surrounding layout and aspect ratios stay fixed.

After entrance, default transform:none/opacity:1 applies without animation fill
retention. No new request, image priority/quality change, below-fold preload,
will-change, blur/filter, canvas, animation dependency, scroll listener, or
per-frame React state is introduced. Browser LCP/CLS and smoothness comparisons
are still required; source-level paintability is not a measured performance claim.

## 8. Carousel Rules

Source: [AppCarousel](../src/components/ui/app-carousel.tsx), Home composition,
[ProductShelf](../src/features/home/components/product-shelf.tsx),
[ShopByDepartmentSection](../src/features/home/components/shop-by-department-section.tsx),
and [HomeCategories](../src/features/categories/components/home-categories.tsx).

Home now has **eight possible rendered instances**, conditional on available data.
Phase 2 preserves the original eager Categories/six deferred shelves and adds
deferred Testimonials:

| Instance | Initialization |
| --- | --- |
| Home Categories | Eager (default); autoplay opted in |
| Best Sellers | Deferred ProductShelf |
| Featured | Deferred ProductShelf |
| Latest Products / New Arrivals | Deferred ProductShelf |
| On Discount | Deferred ProductShelf |
| Personalizable | Deferred ProductShelf |
| Shop by Department | Deferred |
| Testimonials | Deferred; manual navigation only |

Empty sections may omit their carousel. Hero remains static.

- `deferUntilNearViewport` defaults to false, preserving eager consumers.
- Deferred roots start inactive. IntersectionObserver with `300px 0px` root
  margin activates them once near the viewport, then disconnects. Missing
  observer support falls back to activation; unmount cleans up observation.
- Slides/content are SSR-rendered. While inactive, the viewport uses
  `overflow-x-auto` with hidden scrollbars and receives no Embla DOM ref.
  Activation attaches that ref and changes overflow to hidden.
- This defers Embla DOM/runtime initialization, not module download or React
  hydration: Embla and autoplay are static imports and the hook still runs.
- Before deferred activation, content uses `touch-auto` with native horizontal
  viewport overflow. After activation it uses `touch-pan-y`: the browser keeps
  vertical page scrolling while Embla handles horizontal dragging. No custom touch
  listeners are added. Actual device behavior still requires manual QA. Eager
  consumers retain their existing overflow-hidden behavior before hydration;
  this is not a universal no-JavaScript fallback for every carousel.
- Active roots handle left/right arrows with RTL semantics only when the root
  itself is the event target. Preserve child controls and touch dragging.
- Reduced-motion preference is subscribed to after activation; unknown preference
  is treated conservatively. Controls jump rather than animate when reduced;
  autoplay starts only when motion is allowed and scrolling is possible. The
  autoplay plugin stops on focus and meaningful interaction.
- Keep Embla and its plugins inside AppCarousel. Features own slide content and
  layout. No competing slider or direct feature-level Embla implementation.

### Phase 2 affordance rules

- Product and department shelves use the shared Previous/Next IconButtons above
  the viewport on desktop (md and up). Controls never cover card content. Outline
  states, focus rings, real disabled buttons, and fast-token opacity feedback
  reuse the design system. The control row is present from SSR at desktop sizes;
  availability changes do not change its dimensions.
- On mobile, existing product (58% base) and department (60% base) slide widths
  preserve a visible following-card peek. Do not narrow those cards for more
  decoration. Product shelves have no dots, position counters, or autoplay.
- Testimonials uses the same deferred primitive, no autoplay or loop, desktop
  arrows, and a compact mobile `AppCarouselPosition`. Cards and their semantic
  figure/blockquote/figcaption content stay unchanged and server-composed.
  Slide basis is 85% on narrow screens, 60% from sm, and one third from md.
- Position is the selected Embla snap out of the snap count, not a percentage or
  an assumed item index. Numbers are locale-formatted; the caller supplies the
  accessible label. No live region announces every movement. Space is reserved
  while inactive and the counter stays blank until snaps are known.
- Existing AppCarouselPrevious/Next remain disabled until Embla reports scroll
  availability. Controls/indicator never activate Embla themselves. Categories
  stays eager with its existing opt-in autoplay, focus/interaction stop behavior,
  and reduced-motion handling; this is not the default for other content.
- Keep selection updates on select/reInit events, not scroll or per-frame drag
  updates. One activation observer per deferred carousel; no per-card observers,
  new dependencies, eager image loading, or broad client boundaries.
- Browser checks remain pending for touch fallback, RTL arrow semantics, keyboard
  focus, peek/overflow, no-overflow/one-slide states, resize, filter changes, and
  deferred activation. Type/lint checks do not establish visual performance.

## 9. Modal / Surface Motion

Phase 1B implements motion in RafalModal without changing its public API or layouts.
Shared CSS vocabulary is separate from each surface's lifecycle. Current inventory:

| Surface | Existing implementation |
| --- | --- |
| RafalModal / InfoDialog / ConfirmDialog | Radix Dialog, responsive mobile sheet / desktop modal, optional returnFocusRef, dismissal controls |
| ProductPurchaseSuccessSheet | RafalModal bottom-sheet variant |
| ProductGallery lightbox | RafalModal with return focus to image trigger |
| CityPickerDialog | Custom dialog, focus loop/restoration, body scroll lock, Escape/backdrop dismissal |
| Mobile More navigation | Native dialog/showModal, close/cancel handling, trigger focus restoration |

### Motion vocabulary

- Overlay: opacity 0 -> 1 on entry, reverse on exit.
- Desktop modal: opacity plus translateY(0.5rem -> 0), reverse on exit.
- Bottom sheet: opacity plus translateY(100% -> 0), reverse on exit.
- Entry uses 220ms, exit 140ms, both using the existing ease-out. No scale or blur.
- Default modals use sheet motion below the existing Tailwind sm boundary (40rem).
  The explicit bottom-sheet variant remains bottom-aligned at every width.
- Animated transform composes with Tailwind v4's individual translate centering
  utilities; it does not replace the desktop -50% positioning.
- Future drawers should use the same timing/opacity with horizontal travel toward
  their physical edge: left -100%, right +100%. Resolve semantic start/end through
  RTL direction. No drawer consumer exists, so no unused API/CSS is introduced.

### Detailed lifecycle inventory

All Radix consumers use a body portal, fixed overlay, Radix initial focus and Tab
loop, modal background aria isolation, RemoveScroll, and Escape/outside dismissal
unless non-dismissible. Their CSS open/closed animations now run in both directions.

| Surface | Desktop / mobile | Opening and closing / restoration |
| --- | --- | --- |
| RafalModal | Centered desktop; mobile bottom sheet | Controlled open, Radix Presence exit; explicit returnFocusRef or captured opener |
| InfoDialog | Inherits RafalModal | Action requests close; inherits presence, dismissal, and focus |
| ConfirmDialog | Inherits RafalModal | Confirm callback/cancel; loading disables controls, caller owns dismissible policy |
| ProductPurchaseSuccessSheet | Bottom-aligned at both sizes | Inherits Radix; purchase-trigger returnFocusRef; absent when cart missing |
| ProductGallery lightbox | Near-fullscreen desktop viewer; fullscreen mobile | Opt-in RafalModal image-viewer visuals; existing modal motion and lifecycle; image-trigger returnFocusRef, gallery-section fallback for empty media; scoped arrows (section 21) |
| CityPickerDialog | Centered desktop; bottom-aligned mobile | Custom inline div/backdrop, conditional immediate mount/unmount, no portal; manual focus loop, initial/search focus, previous-focus restoration, Escape/backdrop close, body overflow lock; aria-modal but no Radix background aria hiding |
| Mobile More / Categories | Hidden desktop; one mobile bottom sheet | Native dialog showModal/close, top layer and ::backdrop, no React portal; browser modal focus/isolation, cancel/Escape, backdrop-target click, trigger restoration; scoped body overflow restoration and breakpoint cleanup (section 20) |

Before Phase 1B none had authored entrance/exit animation. Existing control hover
transitions are separate. Listing filters and address deletion confirmation also
inherit RafalModal motion without feature edits.

**Parent-unmount limitation:** AddressPage removes AddressForm immediately on
close, so its nested modal gets entry motion but cannot finish exit. Navigation
or missing cart data can likewise remove entire consumers.
Presence cannot retain a component whose parent unmounts it. These feature flows
remain unchanged; fixing them requires separately scoped caller-lifecycle work.

Gallery media becoming empty keeps its modal owner mounted through exit and
restores focus to the persistent gallery section (section 21).

### Exit and accessibility

`motion-surface` and `motion-surface-overlay` use distinct open/closed animation
names. Installed Radix Presence retains each node until its exit animation ends
or is cancelled. Both use identical durations. Keep the component mounted while
toggling open; do not replace these keyframes with plain transitions or `open &&`.
No timeout, delayed React open state, forceMount, or per-frame state is added.

Installed Radix releases trapFocus and outside-pointer blocking at open=false.
During exit, the retained full-screen overlay still intercepts background pointers
and owns RemoveScroll; background aria hiding remains until content unmount.
RafalModal redirects outside focus back to the closing content, retains Radix's
Tab loop, and blocks pointer/click and non-Tab keyboard activation in that content.
Restoration runs on unmount, preferring returnFocusRef, otherwise the captured
opener when connected. Initial focus, names, dismissal policy, and touch scrolling
remain owned by the existing primitive. These paths still require browser QA.

Reduced motion sets animation:none for both states on both nodes. This removes
decorative movement/fades and lets Radix unmount immediately without waiting for
an exit. Preference changes during animation must also be checked manually.

### Independent surfaces not migrated

CityPickerDialog retains its independent lifecycle. Mobile More retains native
dialog ownership with the category-navigation additions described in section 20.
Custom immediate unmount and
native close/top-layer removal require different presence designs for safe exits.
No entrance-only decoration, dependency, or forced shared lifecycle is added.

### Phase 1B verification

Only environment-free TypeScript, lint, and diff checks run on this machine.
Browser tests remain pending: desktop/mobile positioning, rapid close/reopen,
Escape/backdrop, Tab and outside focus during exit, nested surfaces, trigger
restoration, non-dismissible dialogs, reduced-motion changes, background scroll/
pointer isolation, and parent-unmount interruption. Do not run a production build
or reconstruct runtime environment configuration for this phase.

## 10. Product Card Motion

Phase 4B keeps ProductCard presentational and server-compatible. Only linked cards
with a primary and distinct secondary image mount ProductSecondaryMedia, a narrow
client island that receives the existing primary image as children. Cards without
secondary media keep the static path. Existing client listing consumers still
render cards within their own client boundary. No entrance observer, continuous
animation, tilt, parallax, blur, or blanket will-change.

**Single-image recipe:** only the product image scales to 1.02, using the scoped
`--motion-scale-product-card` token, the existing 220ms default duration and
ease-out. This small scale is a Phase 4 engineering choice, not a new Figma token.
The normal image is visible from SSR. Hovering the stretched primary link or
focusing it with `:focus-visible` activates the same CSS transition. Moving away
returns it to its normal transform; rapid re-entry uses the current transition
position without timers or queued animations. The square overflow-hidden media
frame, badges, controls and card layout never move.

Scale is enabled only for `(hover: hover) and (pointer: fine)` with
`prefers-reduced-motion: no-preference`. Coarse/no-hover devices retain the complete
static card during touch browsing. Reduced motion removes scale and crossfade
transitions; a ready secondary may switch immediately on qualifying hover or
visible link focus. Preference changes apply through CSS without eager loading.

The product link has a stretched hit area and owns the card focus ring. Wishlist
remains a separate sibling button above it with its own label, pressed/busy/
disabled states, focus ring and existing 44px hit target. Focusing or hovering
Wishlist alone does not trigger media feedback. Do not make the article a link
or nest buttons inside the primary link. The pre-existing optional Quick Add
slot does not establish or authorize a Quick Add journey.

**Hierarchy and geometry:** title, current/original price, then rating/reviews
in both visual and DOM order. Use existing typography/color tokens; retain
localized backend badges and unavailable presentation without inventing data.
Reserve the existing discounted-price line height for either price state and
allow the original price to wrap on narrow cards without splitting an amount.
The shared skeleton follows the same row order, logical start alignment and
reserved price height. Parent-owned widths, square media and overlay positions
stay fixed; exceptionally long prices can occupy more than one line.

**Listing projection:** `mapProductDtoToListingProduct` retains `imageUrl`: first
product image, otherwise first available variant image. `secondaryImageUrl` is
the first product-image URL distinct from primary, otherwise the first distinct
variant-image URL, otherwise null. Preserve product, variant and image ordering;
compare URLs rather than IDs. Home aliases and all ListingProductCard consumers
share this projection. No gallery array, API contract change, PDP read or extra
application request is introduced.

**Intent:** the primary link's stretched pseudo-element receives the hit, not
the media behind it. Each media island locates its own card's primary link and
attaches native pointerenter/leave/down/cancel and focus/blur listeners directly
to that link. This is local ownership, not collection/global event delegation.
Wishlist is a sibling and does not trigger intent. Images are pointer-transparent;
no listener prevents default, captures pointers or stops event propagation.

Fine-pointer hover starts one 125ms timer only when no pointer button is held.
Leaving, pointerdown (including carousel drag start), pointercancel, blur or
unmount cancels it. At expiry, capability and actual link hover are rechecked.
Touch pointer events never arm it, including on hybrid devices. Visible primary
link focus requests immediately, including external keyboards on coarse-pointer
devices and focus already present at hydration. Non-visible focus does nothing.
No custom modality framework, pointermove listener or viewport trigger is used.

**Lifecycle:** idle renders no secondary Image or resource hint. Accepted intent
removes the link listeners and mounts one optimized Next Image with the same
fill/object-cover/sizes contract, normal lazy loading, empty alt and aria-hidden.
It has no preload/priority, and is absent from initial paint/LCP resource discovery.
The primary remains fully visible underneath while loading and thereafter.
Only successful onLoad changes loading to ready; CSS then fades the secondary
over it for link hover (fine/hover devices) or visible link focus (any pointer).
Leaving/blurring fades back to primary. Both transitions use the 220ms token.
No React state tracks repeat hover/focus; there is no spinner.

Failure removes the secondary and retains the primary without retrying during
that mount. A loaded secondary stays mounted for repeat interaction, avoiding
repeated source insertion. Unmount releases the element; browser HTTP/decoded
image caches retain their normal browser-controlled lifetime. A changed secondary
URL keys a fresh media island, so old readiness/failure state cannot leak to it.

**Cost:** a six-card shelf with no secondary images has zero new media islands;
with six eligible secondaries it has six, including on mobile. Each adds one
wrapper/ref, a lifecycle state slot and a bounded effect with six local listeners
while idle, plus the serialized secondary URL. The client module is shared, not
downloaded six times. Accepted intent removes listeners; cleanup cancels timers.
There are zero secondary image elements/requests before intent, one resource
selection after dwelling on one card, and zero for sub-threshold passes or normal
touch browsing. Cache reuse can reduce network transfers; resize/DPR changes can
select another responsive resource. Repeat hover does not remount the image.

Do not add per-card IntersectionObservers, eager secondaries, gallery-resolution
overrides, global listeners, frame loops or dependencies. Primary loading and
image sizes stay unchanged. Browser verification of hit testing, keyboard/actions,
RTL, drag, image failures, requests, LCP/CLS, memory and large-list smoothness
remains necessary; source checks do not establish measured runtime performance.

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
pointermove animation listener or blanket will-change. Phase 1B adds only bounded
surface CSS keyframes. Tailwind spinner/skeleton animations also use reduced-motion guards.

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

## 17. Phase 0 Repository Evidence and Contradiction Check

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
  Phase 2 replaces the inactive touch action with touch-auto (section 8). The
  code conflict is addressed; device verification remains outstanding.
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
- At Phase 0, modal/sheet motion was not designed. Phase 1B now implements the
  RafalModal lifecycle described in section 9; native/custom integration remains open.
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

## 19. Phase 1B Validation Record

`npx.cmd tsc --noEmit`, `npm.cmd run lint`, and `git diff --check` passed.
No production build or browser/manual QA was run on the company machine.
Files changed: globals.css, rafal-modal.tsx, and this reference. No feature,
city-transition, cart, checkout, carousel, or Hero behavior was changed.

## 20. Categories Navigation

The shell starts one locale-aware `/categories?page=1` server read. Header and
mobile navigation share its promise and a projection containing only IDs, names,
links and one child level. React cache memoizes identical locale/page reads for
the render/request, including the category directory's initial read; defaults are
normalized before memoization. There is no persistent taxonomy cache. Home's
separate `/home` payload is unchanged and cannot supply data upward to the shell.

Navigation streams inside local Suspense boundaries so the new category read
does not block the storefront body or logo/actions. Pending, failed or empty
taxonomy uses direct `/categories` links. The first page is intentionally bounded;
View all categories reaches the existing paginated directory. Do not fetch every
page, children individually, or taxonomy from client menu components. Parent
links use `/categories/{slug}`; child links use that parent route with the existing
`subcategory` query parameter. Preserve API ordering and encoded slugs.

**Desktop:** a button toggles a compact, named navigation region with
aria-expanded/aria-controls. Use regular links and category selector buttons,
not application-menu roles or roving tabindex. Parents with children select one
detail region on click/Enter/Space; leaf categories navigate directly. The detail
region includes a parent-products link and child links. Shallow taxonomy uses a
simple link grid. There is no hover opening or hover switching, no intent timers,
and no pointermove work. Tab/Shift+Tab follow DOM order without a focus trap.

Escape returns focus to the trigger. Tab leaving the disclosure, outside pointer
interaction and normal link navigation close it. Next Link onNavigate preserves
Ctrl/Cmd/middle-click behavior. Pathname changes remount closed navigation state;
popstate handles history changes including same-path query changes. Closing
immediately sets inert/aria-hidden and disables hit testing. The mounted panel
fades/translates out over 140ms and becomes visibility:hidden after that duration;
opening uses 220ms and the existing 0.5rem surface distance/ease-out. No JS exit
timer or new presence library. Reduced motion removes transitions and travel.

**Mobile:** Categories and More use one existing native modal dialog, with one
active surface at a time. Keep showModal/close, native focus containment, Escape
and backdrop dismissal. Category rows have at least 48px touch height; leaves
navigate directly, parents drill into one child list with View all products.
The heading receives focus on drill-in; Back restores focus to the originating
parent row. Close restores the visible opener. A stale queued close event is
ignored if the dialog has already reopened. Body overflow is saved while open
and restored on close, navigation, breakpoint change or unmount.

The native sheet reuses existing surface/backdrop entrance keyframes over 220ms.
Dismissal is immediate: do not delay native close or introduce Radix Presence.
Reduced motion disables entrance animation. Both surfaces use logical alignment,
borders and padding; directional chevrons mirror in RTL, retaining one DOM order.

At the existing md/48rem boundary, an open desktop disclosure closes when moving
to mobile and hands contained focus to the mobile category control. An open
mobile dialog closes on desktop, releases modal/scroll ownership and focuses the
visible desktop category control (or desktop navigation for More). Never leave
a hidden modal open. Each open surface owns one matchMedia change listener and
one popstate listener; desktop additionally owns an outside pointerdown listener.
All are removed on close/unmount. There are no continuous global input listeners.

Header, its actions and layout remain server-composed. Desktop adds one client
disclosure; mobile extends the existing client owner. The bounded navigation
projection is passed to both consumers; hidden desktop markup still hydrates on
mobile. No category images are rendered, so opening/switching adds zero image
requests. New category-panel links disable route prefetch to avoid fetching many
destinations merely by exposing the taxonomy. No per-category observers, new
dependencies or commerce mutations. Browser checks remain required for focus,
native-dialog lifecycle, RTL, slow streaming, resize, layout stability and cost.

## 21. PDP Gallery

### Media and ownership

The PDP mapper projects product images first, then images from the existing
normalized selectable variants, preserving each collection's backend order.
Keep the existing `{ id, src, alt }` projection. First occurrence of a source ID
wins; identical URL strings collapse to the first image, with variant references
rewritten to that canonical ID. Do not strip URL queries or infer equivalent
assets. The API supplies IDs and URLs, but no per-image captions, distinct alt
text or separate original URLs. Alt text remains the localized product name.

ProductPurchaseExperience remains the single selection owner shared with variant
selection. Initially, use the existing initial variant's first valid image, then
the first gallery image. Choosing a variant selects its first valid image (or the
first gallery image); it does not filter, prepend or reorder the gallery. Retain
a valid selection across media updates. If removed, resolve the current variant's
first valid image, then first gallery image, then null, and reconcile the stored
ID before rendering children. Never persist a selected array index.

### Layout, navigation and direction

Use one square, contained primary image at all breakpoints. Multiple images add
48px previous/next controls, a position cue and a bounded horizontal strip of
numbered thumbnail buttons. Thumbnails reserve the same border width in both
states; the selected number is underlined as a non-color cue. Buttons expose
`aria-pressed`, position-qualified translated names, and visible keyboard focus.
Duplicate thumbnail images have empty alt text. Zero images retain the square
placeholder; one image has no thumbnail strip or sequence controls.

The strip scrolls natively on touch. Selection reveals its thumbnail with one
instant horizontal adjustment of the strip only; do not scroll page ancestors.
No smooth scrolling, observers, gesture handlers or custom primary-image swipe.
AppCarousel currently owns independent snap state without a controlled-selection
API. A synchronized primary swipe carousel would require extending that ownership
and its image mounting strategy; do not add a feature-owned Embla integration.

Previous/next wrap through backend sequence order. RTL changes visual placement
and chevrons, not the image array. Right advances in LTR and goes back in RTL;
Left does the inverse. React key handling belongs to the gallery and its owned
portal controls, including the lightbox Close button. Ignore modified arrows,
unrelated controls and page-level input. Thumbnail arrows also move thumbnail
focus. Up/Down retain native scrolling. No global key listener.

### Lightbox and zoom

ProductGallery owns the media, arrow and position composition. It explicitly opts
into RafalModal's `image-viewer` visual variant; other callers retain the default
modal or bottom-sheet appearance. The variant changes only the content/overlay
classes, title visibility, body wrapper spacing and Close geometry. It uses the
existing `data-surface="modal"` motion recipe and the same Radix primitives and
handlers. Do not recreate a dialog or restyle all dialogs for product viewing.

The viewer fills the dynamic viewport below sm/40rem, with no card radius. At sm
and above, use a 1rem outer inset and the existing large radius, without a fixed
maximum width. A quiet gray-100 surface sits over an 80% gray-1000 backdrop.
Avoid decorative shadows, filters, gradients or blur. Safe-area-aware padding
reserves at least 1rem on all sides. The fixed 48px toolbar and 1rem gap leave
the remaining width AND height for a stable rectangular contained-image frame;
the image preserves its own aspect ratio without cropping. Keep the frame's
flex minimum height at zero so short viewports do not force page scrolling.

Retain the Radix Title as screen-reader-only content. The 48px Close button sits
at logical end of the safe toolbar, outside the media. A single compact counter
sits at logical start for multiple images: isolate visual `current / total` in
LTR and expose the existing localized position text to assistive technology.
Previous/next are labeled 48px buttons at the media's logical edges, vertically
centered, with solid light backgrounds, neutral borders and visible focus rings.
They retain existing RTL sequence semantics. One image omits arrows and counter.

Only the persistent primary-image button opens RafalModal. Keep its DOM identity
while the displayed image changes, and return focus to it. Retain Radix Presence,
Escape, focus trap, background isolation, scroll lock and the shared exit lifecycle.
If media becomes empty, close without unmounting the modal owner and use the
persistent, programmatically focusable gallery section as the return target.
Navigation away can still remove the whole parent; it cannot preserve local focus.

The enlarged contained image is the explicit inspection/zoom interaction. Use
the same supported URL with responsive Next Image candidates; never invent an
original endpoint. No custom pinch, panning, pointer tilt or pointer zoom. Keep a
single polite position announcement inside the lightbox to identify navigation
while focus remains on an arrow button; the inline position is not live.

Do not add a duplicate lightbox thumbnail collection without evidence of need.
There is no representative production gallery-size distribution in the repository;
the inline collection already mounts N lazy thumbnail consumers. A second rail
would add N elements and possible candidate/decode/cache cost even when transfers
are cached. Edge arrows and position suffice for the current viewer. Opening adds
zero thumbnail elements or thumbnail requests attributable to a new collection.
Primary-image swipe remains out of scope. Do not add pointer/3D effects or new
motion; reduced motion continues to suppress shared surface/control transitions.

### Images, motion and cost

The initial primary is SSR-visible, square and preloaded, without an entrance
effect, hydration gate or carousel initialization. Freeze its source at mount so
variant updates cannot promote additional resources to preloads. Primary `sizes`
tracks the PDP's 1440px container cap, responsive padding and 44% desktop column.

For N deduplicated images, initial gallery image elements are: zero for N=0,
one for N=1, and N+1 for N>1 (primary plus N thumbnails). Thumbnails use native
lazy loading and responsive 84/100/116px content widths. Browsers may request
nearby offscreen thumbnails; lazy loading is not an interaction-only guarantee.
Only the selected primary-size image exists, never hidden full-size siblings.

Closed Radix Portal content is unmounted. Opening mounts one additional selected
image, with `sizes` matching viewport width minus 2rem on mobile / 4rem from sm.
These are upper bounds when safe-area padding exceeds 1rem. There is no separate
original URL or image-dimension metadata; the rectangular frame contains any
aspect ratio, while width-based candidates can overestimate portrait display size.
The larger viewer may request larger candidates than the former capped square.
Never preload the viewer or adjacent images. With media present, full-size image
elements total one when closed and two when open: inline primary plus viewer.
The shared selection changes both sources, so navigation can request candidates
for both rendered sizes. The optimizer may reuse cache. Presence
retains this image until exit completes. No PDP API requests, speculative media
prefetch or new dependencies. Image decode/cache memory and actual request counts
remain browser-owned; many thumbnail DOM nodes still have a cost.

Image selection is immediate for everyone. Reduced motion removes shared surface
and control transitions without removing any controls; there is no gallery reveal,
per-frame React state, requestAnimationFrame, continuous animation, global pointer
listener or blanket will-change. Keep page/server boundaries intact. Runtime QA
must measure LCP, CLS, decode/memory, large-gallery scrolling, RTL, keyboard/focus,
touch scrolling and slow/failed images; source checks do not establish those results.
