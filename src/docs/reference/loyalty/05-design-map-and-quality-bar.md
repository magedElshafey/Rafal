# Design screenshots, visual mapping, quality and accessibility

## Source screenshots (pixel dimensions as provided)
All 8 files are user-uploaded **static desktop references**, copied without modification into `design/loyalty/`. **There is no supplied mobile/tablet design**. Do NOT use AI guesses as Figma specs; propose adaptive behavior aligned with existing storefront responsive design system and ask for signoff if choices materially affect UI.

| File | Size | Feature / state |
|---|---|---|
| `checkout.png` | 1440 × 1521 | Checkout RTL: main steps, right summary, loyalty toggle and payment line |
| `notifications-panel.png` | 448 × 580 | Header bell popover: loyalty notifications, rows, timestamp, viewed-style samples |
| `order-in-preparation.png` | 1440 × 1417 | Order details: processing timeline and pending earned points |
| `order-cancelled.png` | 1440 × 1601 | Order details: cancelled tracking, earned reversed, points refund note |
| `order-partially-returned.png` | 1440 × 1657 | Order details: partially returned, item-specific return and loyalty financial effects |
| `loyalty-empty.png` | 1440 × 1473 | Account Points: empty history, zero balance and explanatory rules |
| `loyalty-paused.png` | 1440 × 1907 | Account Points: active balance but programme paused and history filters |
| `loyalty-negative.png` | 1440 × 1744 | Account Points: negative balance warning and transaction rows |

## Map
- Account Loyalty screen: 3 `loyalty-*.png` images, use current account sidebar/layout, header/footer.
- Checkout: `checkout.png` (right sidebar summary with loyalty toggle, VAT and points tender line). **Exact screenshot amount/rule examples are illustrative**; real values always API-driven.
- Order details: 3 `order-*.png` images. Returned state from live API had `status='returned'`, while `order-cancelled.png` depicts cancellation; do not conflate them.
- Notification popover: `notifications-panel.png`, but no populated API notification schema observed. UI not blocked for design analysis; data integration blocked until contract known.

## Pixel fidelity, practical workflow
1. Compare screenshot at its original 1440px desktop viewport, account for browser chrome and system fonts; reuse site tokens/fonts/container/borders/spacing before hardcoding pixels.
2. Identify repeatable primitives from existing app (cards, buttons, typography, inputs, tabs, status labels, skeletons, sidebar, header, footer); do **not** replace shared design system.
3. Record measured layout widths, gaps, alignment, background colors, radius, RTL order and typography after inspecting actual PNGs. Use screenshots as visual target, not as source for data semantics.
4. Screenshots don't prove interactions, hover/focus, mobile stacking, form validation or dynamic sizes. Follow established responsive breakpoints; check at 320/375/390/768/1024/1440px as practical verification samples, not a guarantee for every device.
5. Preserve Arabic RTL and English LTR; include long names, prices, larger text and zoom; avoid clipped controls, horizontal page scroll and icon direction mistakes.
6. Loading states: skeletons matching **the dimensions and layout** of final cards, table rows, sidebar, price summary and order detail, minimizing CLS. Prefer existing skeleton component. Error/empty/paused/negative states differentiated and accessible.
7. Keep a11y: labels for icon-only actions and toggle, semantic headings, keyboard navigation, focus visible, descriptive status updates (`aria-live` where appropriate), touch targets and sufficient contrast. Count badge should be available to screen readers, not icon-only numbers.
8. Avoid extra HTTP requests for badge/loyalty where cache/store already has data. Align quote request ownership with existing checkout state, handle rapid toggles and stale responses, request cancellation / stale-request guard per existing patterns. No extra repeated fetch loops.
9. Use server components where fitting and client components only for true interactions; do NOT migrate existing architecture wholesale. Avoid unnecessary memoization just for style; profile if an actual rerender issue exists.

## Image availability to Codex
Codex **does not see images in this chat automatically**. Copy the whole pack into the local **Storefront repo root**, preserving `design/loyalty/*.png`; ask Codex to inspect those local PNGs using its available image viewing capability. If its runtime cannot view local images, state that blocker, and rely on descriptions + developer visual comparison; do not claim pixel-perfect verification without viewing.
