# DESIGN_SYSTEM.md — Rafal Storefront

## 1. Purpose

This document tells engineers and coding agents **how to consume the approved Rafal Figma design system** without inventing visual rules during feature implementation.

The approved Figma design/prototype is the visual source of truth.

Important: exact Figma token values/components were not available in the project files used to generate this document. Therefore this file intentionally defines governance and implementation rules without fabricating colors, font sizes, spacing values, radii, shadows, or component variants.

When exact Figma tokens are exported/confirmed, record them in the token sections below and keep this file synchronized with code.

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

Do not guess missing values from screenshots.
If Figma and code disagree, report the mismatch before propagating a new token.

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
TODO: sync exact approved Figma color tokens.
```

### Typography

```text
TODO: sync exact approved font family, weight, size, line-height and letter-spacing tokens.
```

### Spacing

```text
TODO: sync exact approved spacing scale.
```

### Radius

```text
TODO: sync exact approved radius scale.
```

### Shadows / Elevation

```text
TODO: sync exact approved elevation tokens.
```

### Breakpoints

```text
TODO: sync exact project/Figma breakpoints from the implemented responsive system.
```

Do not let an agent fill these TODOs by approximation.

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

States should follow approved designs when available. If a required functional state is missing from Figma, use existing system conventions and flag the gap rather than inventing a new visual language.

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

The reusable card must be capable of the approved catalogue contexts without embedding page-specific fetching/business rules.

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

Use the project's approved icon source/library if one is already installed.

Do not add a second icon library for a handful of icons.
Do not recreate brand/provider logos as arbitrary text/icons.

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
