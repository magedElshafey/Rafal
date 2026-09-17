# ADR — Guest Cart Ownership & Persistence

## Status

Approved for PDP 05A.

## Context

Guests can add products and complete checkout without authentication. Their
Cart must later merge into the authenticated customer Cart, while Product
configuration, location, availability, pricing, personalization fees, and
totals remain server-authoritative.

## Decision

- Cart is server-owned. The browser submits configuration intent only.
- Guest identity is an opaque HttpOnly session cookie containing no Cart data.
- Server Actions are the web mutation transport.
- Interactive browser reads use a private, no-store `GET /api/cart` Route
  Handler. Server Components call the Cart server boundary directly.
- TanStack Query is approved for the shared current-Cart browser projection.
  Its key contains locale, but no guest session, customer, location, or
  warehouse identity.
- Development uses a bounded, expiring, server-only in-memory adapter. It is
  unavailable in production and stores only line intent.
- The development adapter creates a new line for every add operation. This is
  not the production line-equality policy.

The browser does not own or submit prices, fees, stock, quantity limits,
location, warehouse, customer identity, Cart identity, or totals. Cart
snapshots are materialized from current authoritative Product and location
sources whenever they are read or mutated.

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

## Laravel replacement seam

UI consumers depend on Cart contracts, query definitions, and the Cart server
boundary. Laravel will replace the mock repository behind that boundary and
will own persistence, authenticated identity, pricing, line equality, merge
behavior, concurrency, and idempotency. This replacement must not require PDP,
Header, Cart, or Checkout component rewrites.

## Open production decisions

- equivalent-line equality, including personalization equality;
- guest/customer merge conflict and quantity-overflow policy;
- whether success UI wording uses line count or total quantity;
- concurrent backend mutation and idempotency contract;
- final Laravel Cart endpoints and DTOs;
- final production cookie/session name, ownership, rotation, and lifetime.
