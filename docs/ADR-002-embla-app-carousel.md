# ADR-002 — Use Embla Behind the AppCarousel Primitive

## Status

Accepted for the Rafal storefront.

## Context

The storefront needs a reusable carousel foundation for the Home hero and
future category, product, related-product, and promotional carousels. These use
cases require different slide widths, gaps, control layouts, and responsive
composition while sharing reliable drag, swipe, direction, and navigation
behavior.

## Decision

Use stable `embla-carousel-react` as the headless interaction engine behind the
canonical `AppCarousel` primitive in `src/components/ui/app-carousel.tsx`.

`AppCarousel` owns:

- Embla setup and lifecycle;
- RTL/LTR direction and direction-aware keyboard behavior;
- carousel, slide, control, and pagination semantics;
- previous/next availability and selected-snap state;
- reduced-motion-aware programmatic navigation.

Feature modules own their content, dimensions, responsive slide basis, gaps,
aspect ratios, and control placement. They may compose `AppCarousel`, but must
not import Embla directly. Autoplay remains off and no autoplay or fade plugin
is installed until an approved design explicitly requires it.

## Alternatives considered

- **Custom carousel engine:** rejected because robust pointer physics, resize
  handling, snapping, and bidirectional behavior would add significant bespoke
  code and maintenance risk.
- **Swiper, Slick, or Keen Slider:** rejected because the approved direction is
  Embla and these would add a competing carousel dependency and API.
- **Feature-specific Embla integrations:** rejected because they would duplicate
  lifecycle, accessibility, RTL, and control behavior across features.

## Why Embla

Embla is headless and leaves visual layout to Rafal components, supports RTL,
drag/swipe, looping, variable slide sizes, and multiple slides per viewport,
and has a small integration surface appropriate for a focused Client Component
boundary.

## Accessibility responsibilities

Embla provides interaction mechanics, not the complete accessible UI contract.
`AppCarousel` therefore owns region and slide semantics, caller-supplied labels,
direction-aware keyboard navigation, accessible control state, and reduced-motion
behavior. Feature callers remain responsible for meaningful localized labels and
accessible slide content.

## Performance and dependency boundary

Only `AppCarousel` imports `embla-carousel-react`. Data loading and slide content
remain server-first where possible, so feature pages do not become Client
Components. Plugins are not installed speculatively, and carousel event
subscriptions are cleaned up with the primitive lifecycle.

## Consequences

- All storefront carousels reuse `AppCarousel`.
- Slide layout remains CSS/caller-owned rather than a rigid `slidesPerView` API.
- Replacing or materially extending the engine requires an approved architecture
  decision.
