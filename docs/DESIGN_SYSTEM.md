# DESIGN_SYSTEM.md — Rafal Storefront

## 1. Purpose

This document tells engineers and coding agents **how to consume the approved Rafal Figma design system** without inventing visual rules during feature implementation.

The approved Figma design/prototype is the visual source of truth. The DS-01
foundation values recorded below are approved and implemented in
`src/app/globals.css`. Keep this document synchronized with code as additional
Figma tokens are confirmed.

## 2. Design-System Principle

Feature work should assemble approved primitives and patterns.
It should not create a new mini design system inside each route.

Before creating UI:

1. search for an existing primitive;
2. search for an existing feature pattern;
3. compare with the approved Figma component/variant;
4. extend an existing component when the visual/behavioral concept is the same;
5. create a new component only when the concept is genuinely new.

## 3. Sources of Truth

Priority for visual decisions:

1. approved Figma component/variant for the target screen;
2. documented design tokens in this file/code;
3. existing matching production component;
4. task-specific approved UI note.

Do not guess missing values from screenshots. When direct Figma inspection exposes
an exact value that contradicts an earlier implementation approximation, correct
the approximation and record the correction here. Stop when Figma sources
conflict with each other or when the missing decision affects behavior or
architecture.

## 4. Token Policy

All repeated visual values should come from semantic or foundation tokens where the current styling system supports them.

Token categories to maintain:

- color;
- typography;
- spacing;
- sizing;
- border radius;
- border width/style;
- elevation/shadow;
- breakpoints;
- motion/duration;
- z-index/layering where needed.

Avoid one-off literals when an approved token exists.

### Token naming

Prefer meaning over raw visual description for semantic tokens.

Examples of concepts (not literal required names):

```text
color.text.primary
color.text.secondary
color.surface.page
color.surface.card
color.border.default
color.action.primary
color.feedback.success
color.feedback.error
```

Foundation tokens may still express raw scales where useful, but feature code should prefer semantic meaning.

## 5. Figma Token Registry

Fill this section only from approved Figma/code values.

### Colors

```text
Gray:
gray-0 #FFFFFF    gray-50 #FAFAFA    gray-100 #F2F2F2
gray-200 #E5E5E5 gray-300 #D4D4D4   gray-400 #A3A3A3
gray-500 #737373 gray-600 #525252   gray-700 #404040
gray-800 #262626 gray-900 #171717   gray-1000 #000000

Gold:
gold-50 #FBF3E7  gold-100 #F3E0C2  gold-200 #E8C99A
gold-300 #DCB073 gold-400 #CC9A5C  gold-500 #B8834A
gold-600 #9C6B39 gold-700 #7D5330  gold-800 #5E3E26
gold-900 #402A1A

Semantic:
background gray-0             foreground gray-900
muted gray-100                muted-foreground gray-600
border gray-200               primary gold-500
primary-foreground gray-0     accent gold-50
accent-foreground gold-900    ring gold-500
```

The Figma base/state variables and the Badge, Input, and Toast component sets
confirm these semantic feedback colors:

```text
destructive #C62828
success     #2E7D32
warning     #C77700
info        #1565C0
```

Warning is defined by Figma variables even though no DS-02 component variant
currently demonstrates it. It is not an engineering fallback.

### Typography

```text
Font family: Tajawal

Display    32px / 40px / 700
H1         28px / 36px / 700
H2         24px / 32px / 700
H3         20px / 28px / 500
H4         18px / 24px / 500
Body Large 16px / 24px / 400
Body       14px / 20px / 400
Body Small 12px / 16px / 400
Caption    11px / 14px / 400
Price      18px / 24px / 700
UI Small   13px / 16px / 500
Label      12px / 14px / 500
Badge      10px / 12px / 500
Card Price 15px / 18px / 700
Card Discount Price 16px / 19px / 700
Card Original Price 12px / 14px / 400
```

Tajawal is loaded through `next/font` with the approved 400, 500, and 700
weights. Foundation Tailwind utilities are exposed as `text-display`,
`text-h1` through `text-h4`, `text-body-lg`, `text-body`, `text-body-sm`,
`text-caption`, and `text-price`. DS-02 components use the equivalent
`type-body*`, `type-caption`, `type-ui-sm`, `type-label`, `type-badge`, and
`type-card-price` utilities so `cn()`/`tailwind-merge` cannot mistake a
font-size utility for a text-color utility and discard either style.

### Spacing

```text
Base grid: 4px
Preferred values: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px
Tailwind utilities: 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24
```

Prefer these standard utilities. Use arbitrary spacing only when an exact
approved design requires a value outside the scale.

### Radius

```text
none 0    sm 4px    md 8px
lg 16px   xl 24px   full 999px
```

These values come from Figma's `radius/*` variables. The earlier duplicate
8px `md`/`lg` aliases and undocumented 12px/16px additions were removed.

### Shadows / Elevation

```text
product-card-wishlist  0 1px 4px rgb(0 0 0 / 15%)
product-card-quick-add 0 2px 4px rgb(0 0 0 / 15%)
```

Both values are taken from the corresponding Product Card controls in Figma.

### Breakpoints

```text
TODO: sync exact project/Figma breakpoints from the implemented responsive system.
```

Do not let an agent fill these TODOs by approximation.

## 5.1 Implementation Conventions

### shadcn/ui

shadcn/ui is an approved implementation foundation, not a visual source of
truth or a separately adopted visual system. Its generated structure and
accessibility patterns may be used, but every component must consume Rafal
tokens and match approved Figma. Do not retain shadcn defaults that conflict
with Rafal. The minimal generator configuration lives in `components.json`.

### Class composition

Use the canonical `cn()` helper from `src/lib/utils.ts` for conditional class
composition and Tailwind conflict resolution. Do not introduce competing class
helpers.

### Variants

Use Class Variance Authority (CVA) only for reusable components that have
meaningful, intent-based variants. Plain components and one-off class lists do
not need CVA.

### Icons

Phosphor Icons (`@phosphor-icons/react`) is the project icon system. Do not add
Lucide or a second general-purpose icon library. Review directional icons for
correct RTL behavior.

## 5.2 Layout Primitives

`Container` owns horizontal page layout: centering, responsive inline gutters,
and max width. Its DS-01 sizes are implementation defaults pending final Figma
desktop-frame verification:

```text
narrow  48rem / 768px
default 64rem / 1024px
wide    80rem / 1280px
full    no max width

gutters 16px base, 24px from sm, 32px from lg
```

`Section` owns vertical section rhythm only. Its spacing variants are `none`
(0), `sm` (16px), `md` (32px), `lg` (48px), and `xl` (64px). It must not add
horizontal gutters or max-width behavior; compose it with `Container` when both
responsibilities are needed.

## 5.3 DS-02 Component Registry

### Button

`Button` is the semantic text/action primitive. Its Figma-backed API is:

```tsx
<Button variant="primary | secondary | outline | ghost" size="sm | md | lg" />
```

The sizes are 36px, 44px, and 52px tall, with inline padding of 14px, 20px,
and 24px respectively. Figma defines only Default and Disabled states. Hover
and pressed opacity, the token-based focus-visible ring, and the
dimension-preserving loading overlay are engineering/accessibility fallbacks,
not Figma-approved visual states. Loading sets `aria-busy`, exposes the supplied
loading label as the accessible name, and prevents repeated activation.

`IconButton` supports `filled`, `outline`, and `ghost` visual variants. Its
visual control sizes are 32px, 40px, and 48px. The corresponding Figma artwork
sizes are 12.8px, 16px, and 19.2px; SVG proportions are preserved and the art
is centered rather than stretched. An invisible 44px minimum activation area
extends around controls whose visual size is smaller than the accessibility
target. Every IconButton requires an accessible `aria-label`.

### Input

`Input` is the generic native text-input primitive. `InputField` composes it
with a required label and optional helper/error message. The Figma-backed field
height is 44px with 14px inline padding, an 8px radius, a 1px default border,
and a 1.5px gold focused border. Default, filled, focused, error, and disabled
states are supported. `InputField` owns `htmlFor`, `aria-invalid`, and
`aria-describedby` wiring; callers provide a stable `id` and localized copy.
Phone-specific business structure is intentionally not part of this generic API.

`PhoneInputField` is the separate DS-02 compound control shown under Figma Auth
Components. It composes a 44px field, 78px country-prefix region, 22x16px flag,
24px divider, country code, and native `tel` input. Its country data is supplied
by the caller; it contains no authentication, validation, or formatting logic.

### Badge

`Badge` variants are semantic: `discount`, `new`, `personalization`, and
`unavailable`. They use the Figma-confirmed destructive, success, gold, and
gray tokens, with localized children and no fixed text width. The approved
geometry is a 20px minimum height, 9px inline padding, 4px block padding, and a
full radius.

### Icon architecture

The Rafal icon catalog lives in `src/components/ui/icons`. Standard interface
icons are local SVG React components using the regular Phosphor vector paths
named by Figma's `Icons (Phosphor)` section. They share a 256px viewBox,
`currentColor`, `size`, `className`, and optional `label` API. Decorative icons
are `aria-hidden` by default; a supplied label exposes the icon as an image.

Fixed-color brand and payment assets are separate SVG components. They retain
their Figma/official brand colors and therefore do not use `currentColor`, with
the exception of single-color marks whose color is intentionally inherited.
Figma-provided/custom vectors take priority for brand and payment fidelity;
Phosphor package components remain allowed only for general-purpose glyphs not
defined by the approved catalog, such as the Button loading spinner.

### DS-02 sizing and detail tokens

```text
product-card-reference-width 170px
rating-width             58px
rating-star-size          10px
badge-padding-inline      9px
border-width-emphasis   1.5px
icon-button-art-sm      12.8px
icon-button-art-md        16px
icon-button-art-lg      19.2px
product-card-wishlist     28px control / 14px art
phone-input-prefix        78px
phone-input-flag          22px x 16px
```

These values are component geometry verified directly in the Button, Icon
Button, Input, Badge, and Product Card Figma component sets.

## 6. RTL and Arabic

Arabic/RTL is a first-class design constraint.

Implementation rules:

- document/layout direction should be established globally for Arabic;
- prefer logical CSS properties (`margin-inline`, `padding-inline`, `inset-inline`, etc.) where supported by the project styling approach;
- icons indicating direction/navigation must mirror only when semantically appropriate;
- numeric values, SKUs, prices, phone numbers and mixed Arabic/Latin text require careful bidi testing;
- do not solve RTL with duplicate Arabic-only components unless a real design difference exists.

## 7. Responsive Design

The storefront is mobile-first and must support mobile and desktop approved layouts.

Do not assume desktop is a scaled-up mobile layout. Figma may define structural changes.

When implementing a screen:

- identify mobile and desktop composition;
- identify whether components reflow, reorder, become sticky, collapse, or change interaction mode;
- preserve content hierarchy across sizes;
- avoid JavaScript viewport branching when CSS layout can express the design.

Examples from approved product requirements include different mobile/desktop behavior for sticky purchase UI and deal-price presentation.

## 8. Component Layers

### 8.1 Primitives

Examples:

- Button
- Input
- Textarea
- Checkbox
- Radio
- Switch
- Badge
- IconButton
- Divider
- Skeleton

Primitives own visual variants and accessibility behavior, not ecommerce business rules.

### 8.2 Composite reusable components

Examples:

- ProductCard
- PriceDisplay
- RatingSummary
- QuantityControl
- EmptyState
- Pagination / list controls
- Dialog / Drawer / BottomSheet abstraction if established by the codebase

These may understand a reusable ecommerce concept but should avoid page-specific orchestration.

### 8.3 Feature components

Examples:

- ProductPurchasePanel
- CartItem
- CouponSelector
- GiftRecipientForm
- CheckoutPaymentStep

Feature components may own feature behavior and compose design-system primitives.

## 9. Component Variant Rules

When Figma shows multiple variants of the same concept, model them as variants rather than separate copy/pasted components when this keeps the API clear.

A component variant API should describe intent.

Prefer:

```text
<Button variant="primary" size="lg" />
```

over visual implementation names such as:

```text
<Button variant="brownGradient42px" />
```

Do not create a giant polymorphic component with dozens of unrelated boolean props.
Split concepts when they are actually different controls.

## 10. Required UI States

A component is not complete when only the default Figma frame is implemented.

Where relevant, support:

- default;
- hover;
- focus-visible;
- active/pressed;
- disabled;
- loading;
- selected;
- error;
- success;
- empty;
- unavailable/out-of-stock.

States should follow approved designs when available. For DS-02 Button states
that are absent from Figma, token-based opacity, the existing focus ring, and a
dimension-preserving loading overlay are documented engineering/accessibility
fallbacks rather than approved Figma visual states. Other missing states remain
design gaps and must not be invented silently.

## 11. Forms

Form design must preserve:

- visible label or approved accessible equivalent;
- helper text when specified;
- clear validation message;
- error state not communicated only by color;
- disabled/read-only distinction;
- keyboard usability;
- mobile-friendly input targets and input modes.

Do not hide essential validation behind toast-only feedback.

## 12. Product Card

The BRD expects product cards to support product imagery, name, price/discount context and rating where applicable.

The reusable `ProductCard` accepts typed display data and action-button props;
it performs no fetching, formatting, inventory lookup, or state management. It
composes a relative `ProductMedia` layer and a `ProductInfo` layer from `Badge`,
`IconButton`, `Rating`, and `PriceDisplay`. The Figma component reference is
170px wide, but width is owned by the parent/grid in code (`w-full`); the media
keeps a square aspect ratio and callers must provide an accurate responsive
`imageSizes` value. It supports the approved default,
personalization, discount, new, quick-add, and unavailable badge treatments.
Prices and all labels are passed in already localized/formatted so this
component does not create currency or localization architecture.

The single product link uses a stretched hit area while media actions remain
sibling buttons above it, preventing nested interactive elements. Badge and
quick-add sit at logical `end`; wishlist sits at logical `start`, matching the
approved RTL frame. All overlays are positioned relative to ProductMedia, not
to the full card.
Unavailable state disables quick add when supplied and requires callers to
provide the localized unavailable label.

Figma's standalone Rating Stars set defines only integer 1-5 variants. The
Product Card uses 10px versions of the same five-point star with 2px gaps.
`Rating` preserves the numeric average and uses proportional fill for a
fractional star as an explicitly documented engineering representation; Figma
does not currently define a half/partial-star variant.

Product availability and location/warehouse behavior should be provided to the card as data/state, not computed from browser storage inside the card.

## 13. Product Detail Page Patterns

The PDP includes multiple reusable visual/business patterns, including:

- product gallery;
- product title/details/SKU;
- warehouse-aware availability;
- VAT-inclusive price communication;
- discount percentage badge;
- countdown when a real discount end date exists;
- variants;
- quantity control;
- personalization input for eligible products;
- add-to-cart action;
- wishlist;
- reviews summary/content;
- related products;
- informational BNPL presentation;
- additional product carousel;
- sticky purchase UI on mobile and desktop according to their respective approved designs.

These should be composed from reusable primitives rather than implemented as a single unmaintainable page component.

## 14. Cart and Checkout Patterns

Cart/checkout designs must account for meaningful transactional states, not only static layouts:

- quantity updates;
- removal/undo or confirmation behavior;
- inventory revalidation;
- coupon application and invalid states;
- gift recipient enabled/disabled state;
- gift wrapping enabled/disabled state;
- guest vs authenticated flow;
- loading submission;
- payment failure;
- retry/return-to-cart.

Do not let visual refactoring change these business states.

## 15. Images

Use approved aspect ratios and responsive behavior from Figma.

Engineering rules:

- use Next.js image optimization where appropriate;
- reserve dimensions/aspect ratio to prevent layout shift;
- product imagery must have meaningful alt text unless an image is intentionally decorative;
- decorative icons/images must not create noisy accessibility output.

## 16. Icons

Use the local Rafal SVG components for standard interface glyphs. Use the fixed
SVG components in the same catalog for brand, social, country, and payment
marks.

Do not add a second icon library for a handful of icons.
Do not recreate brand/provider logos as arbitrary text/icons and do not recolor
fixed-color provider assets with `currentColor`.

Directional icons must be reviewed for RTL semantics.

## 17. Motion

Motion should support comprehension, not decoration.

- honor reduced-motion preferences for non-essential motion;
- avoid long transitions that block commerce interactions;
- use established system durations/easing once tokens are documented;
- do not invent animation language per feature.

## 18. Accessibility Contract

Pixel accuracy does not override accessibility.

Reusable primitives must centrally preserve:

- semantic element choice;
- keyboard interaction;
- focus-visible styling;
- ARIA only where semantic HTML is insufficient;
- disabled semantics;
- dialog/sheet focus handling;
- adequate interaction target sizes.

## 19. Figma-to-Code Review Checklist

Before marking a UI task complete:

- [ ] Correct approved Figma frame/variant used
- [ ] Mobile layout verified
- [ ] Desktop layout verified
- [ ] RTL verified
- [ ] Existing tokens reused
- [ ] Existing components reused where appropriate
- [ ] Typography matches approved token/style
- [ ] Spacing/radius/elevation use approved values
- [ ] Loading state covered
- [ ] Empty state covered where relevant
- [ ] Error state covered where relevant
- [ ] Disabled/unavailable state covered where relevant
- [ ] Keyboard/focus behavior checked
- [ ] No unnecessary client component boundary added
- [ ] No hard-coded user-facing strings outside localization convention

## 20. Agent Stop Conditions

A coding agent must stop and ask/report rather than decide silently when:

- exact Figma value is unavailable and no code token exists;
- two Figma frames imply contradictory component behavior;
- a new design token would be required;
- a new styling framework/library would be required;
- the design requires behavior contradicting BRD/business rules;
- a missing responsive/interactive state materially affects the feature.
