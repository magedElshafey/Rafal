# ADR — Guest Cart Ownership & Persistence

## Status

Approved and activated for the Laravel Cart vertical slice.

## Context

Guests can add products and complete checkout without authentication. Their
Cart must later merge into the authenticated customer Cart, while Product
configuration, location, availability, pricing, personalization fees, and
totals remain server-authoritative.

## Decision

- Cart is server-owned. The browser submits configuration intent only.
- Laravel guest identity is the opaque `rafal_cart_token` HttpOnly cookie. It
  is `Secure` in production, `SameSite=Lax`, and scoped to `/`; it contains no
  Cart data and is never exposed to browser JavaScript.
- Server Actions are the web mutation transport.
- Interactive browser reads use a private, no-store `GET /api/cart` Route
  Handler. Server Components call the Cart server boundary directly.
- TanStack Query is approved for the shared current-Cart browser projection.
  Its key contains locale, but no guest session, customer, location, or
  warehouse identity.
- Laravel Cart transport is JSON. The server boundary reads the guest cookie,
  sends it as `X-Cart-Token`, maps the Laravel response, and stores the token
  returned by the first successful guest mutation. A tokenless `GET /cart`
  stays tokenless and does not fabricate guest identity. The token is stable
  for the Cart lifetime, and successful `DELETE /cart` deletes the cookie.
- Authenticated Cart transport is reserved for a server-resolved Bearer token.
  Real authentication does not expose that token yet, so authenticated Cart
  activation and Guest-to-User merge remain deferred; no mock token or fake
  merge is used.
- Development uses a bounded, expiring, server-only in-memory adapter. It is
  unavailable in production and stores only line intent.
- The development adapter creates a new line for every add operation. This is
  not the production line-equality policy.

The browser does not own or submit prices, fees, stock,
location, warehouse, customer identity, Cart identity, or totals. Cart
configuration intent contains only Variant, quantity, and optional
personalization. The server resolves the canonical numeric Laravel city ID.
Laravel owns all production Cart pricing, discounts, VAT, shipping, fees,
totals, stock validation, and line identity.

`settings.max_cart_item_quantity` is the frontend-visible quantity ceiling;
physical `stock.available` is a distinct warehouse fact and is not used as the
purchase limit. Different personalization configurations remain distinct Cart
lines according to Laravel's line-identity rules.

## Alternatives rejected

- `localStorage` or `sessionStorage` as Cart authority;
- a full Cart encoded in cookies;
- a global Cart React context, Redux, or Zustand store;
- Cart reads in the broad storefront layout;
- Server Actions as the recurring interactive read transport;
- a general-purpose Next.js BFF for unrelated domains.

## Consequences

- Guest identity and Cart contents remain separate.
- Header, PDP, Cart, and Checkout consumers can share one canonical browser
  snapshot without becoming financial authorities.
- Location and authentication transitions must invalidate, remove, or replace
  current-Cart queries at their explicit integration seams.
- Development Cart state can disappear after HMR or process restart and is not
  shared between server instances.
- Mutation responses replace the browser snapshot directly; automatic mutation
  retries are not allowed.

## Laravel boundary

UI consumers depend on the mapped Cart domain, query definitions, and Cart
server boundary. Laravel DTOs and snake_case fields remain inside the Cart API
adapter. Mutation responses replace the TanStack Query snapshot directly; no
immediate refetch or optimistic money calculation occurs.

## Deferred decisions

- Guest-to-User merge endpoint and conflict policy;
- real Auth bearer-token activation;
- Checkout and successful Place Order token invalidation;
- concurrent mutation/idempotency contract;
- authenticated coupon UI. Guest coupons are currently unsupported, which is
  a known backend/product deviation from BRD v0.4;
- full gift and gift-wrap UI. The `PUT /cart/gift` request contract is reserved,
  but Checkout remains the next phase.
