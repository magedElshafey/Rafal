# ARCHITECTURE.md — Rafal Storefront

## 1. Status

This document describes the **current architectural guardrails** for the Rafal Next.js storefront.

It is intentionally more restrictive than a generic Next.js guide: coding agents must implement within these boundaries rather than inventing architecture per task.

## 2. Current Technology Decisions

### Web framework
- Next.js
- App Router
- TypeScript

### Rendering model
- React Server Components by default
- Client Components only for browser-side interactivity

### Localization
- `next-intl`
- Arabic is the Phase 1 primary locale
- RTL is handled as an application/layout concern

### Backend
- Separate Laravel backend
- Frontend consumes defined HTTP/API contracts
- Odoo, payment, shipping, OTP, and email integrations are backend/integration concerns unless a frontend-specific provider SDK is explicitly approved

## 3. Architecture Principles

### 3.1 Server-first
Prefer server-rendered data and Server Components when no browser interaction is required.

Reasons:

- less client JavaScript;
- better initial rendering;
- simpler data access boundaries;
- better SEO compatibility;
- fewer hydration concerns.

A component becomes client-side because of a concrete requirement, not because its parent happens to be interactive.

### 3.2 Keep boundaries local
Push `"use client"` down to the smallest useful interactive island.

Example:

- Product page shell/data → Server Component
- product gallery interaction → Client Component if required
- quantity selector → Client Component
- static description → Server Component

### 3.3 Separate external DTOs from UI models when needed
Do not let unstable or backend-shaped payloads leak through the entire component tree.

When transformation is non-trivial:

`API DTO -> mapper/adapter -> UI/domain model -> component`

Do not create mapper layers for trivial pass-through data merely for ceremony.

### 3.4 URL is state when users should be able to share/reload it
Search terms, category filters, sort options, pagination and similar discoverable list state should use URL/search parameters when consistent with the approved UX.

Do not hide shareable catalogue state only inside React state.

### 3.5 No premature global state
Use the narrowest state scope that works.

Preferred order:

1. server/request data;
2. URL state;
3. local component state;
4. lifted feature state/context when multiple children genuinely share it;
5. global client store only after an explicit architecture decision.

No global state library is currently authorized by this document.

## 4. Proposed Repository Ownership Model

Use the existing repository structure if it is already established. Do not reorganize the whole project just to match this example.

For new code, preserve clear ownership along these lines:

```text
src/
  app/
    [locale]/
      ...routes
  components/
    ui/              # reusable design-system primitives
  features/
    <feature>/
      components/
      api/
      types/
      utils/
      hooks/          # only when client hooks are truly needed
  i18n/
  lib/
  types/
```

Rules:

- `app/` owns routing, layouts, route metadata and route composition.
- `components/ui/` owns reusable UI primitives, not business flows.
- `features/` owns feature-specific behavior.
- `lib/` owns cross-feature infrastructure/helpers, not miscellaneous dumping.
- shared `types/` should contain genuinely cross-feature types only.

If the current repository already uses different names but equivalent boundaries, keep them. A repo-wide structural migration requires an ADR.

## 5. Routing

Use Next.js App Router filesystem routing.

Route components should primarily compose feature modules and data requirements. Avoid placing large business logic directly inside `page.tsx`.

Use Next.js route-level files when their behavior is actually needed:

- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`

Do not create them mechanically for every folder.

## 6. Localization Architecture

`next-intl` is the approved localization layer.

Responsibilities:

- locale-aware routing/configuration;
- translation messages;
- formatting where appropriate;
- Arabic RTL document direction.

Guardrails:

- do not add another i18n library;
- do not scatter RTL-specific overrides when logical CSS/layout primitives solve the problem;
- do not encode Arabic-only assumptions inside reusable APIs when a neutral structure costs little;
- do not prematurely implement full Phase 2 locale/currency switching.

## 7. Data Fetching

No new data-fetching library is authorized by this document.

Default approach:

- fetch server-readable page data in Server Components/server-side modules;
- use the platform/native fetch approach supported by the project;
- use client fetching only for interactions that truly happen after hydration and cannot be expressed through navigation/server actions/API mutation flow already established by the repository.

Before adding React Query/SWR or another caching client, write an Architecture Decision Request explaining why existing primitives are insufficient.

## 8. Mutation Strategy

The exact mutation transport should follow the existing backend contract and established repository pattern.

Do not independently decide to introduce Server Actions, a BFF, or a client-side mutation framework across the codebase.

For each feature, preserve:

- typed input;
- validation boundary;
- explicit pending state;
- explicit success/failure behavior;
- user-safe error messages;
- cache/revalidation behavior where relevant.

If no mutation pattern exists yet, raise an architecture decision before establishing a cross-project standard.

## 9. State Domains

### Catalogue/search state
Prefer URL search params for user-shareable filtering/sorting/search state.

### Location state
Location/city is business-critical because it changes warehouse/product availability.

Its durable storage and synchronization strategy must follow the approved backend/session design. Do not invent whether cookie, backend session, local storage, account profile, or another mechanism is the source of truth.

Until the API/session contract is explicit, components should depend on a location abstraction rather than reading arbitrary storage directly.

### Cart state
Guest cart and registered cart have merge/business rules.

Do not choose persistence rules from the frontend alone. The implementation must follow the backend/session contract and preserve guest-to-customer merge behavior.

### Auth state
Authentication uses email + OTP and no password.

Frontend authorization state must reflect server/backend identity. Do not treat client storage as an authentication authority.

## 10. API Layer

Create feature-oriented API functions rather than making ad-hoc requests deep inside arbitrary presentational components.

Good boundary:

```text
feature -> feature API function -> backend contract
```

API modules should:

- type request/response DTOs;
- centralize base URL/config usage;
- standardize expected error translation only where a project convention exists;
- avoid leaking secrets to browser bundles.

Do not create a generic repository/service abstraction for every endpoint unless repeated complexity proves it useful.

## 11. Validation

Business-critical input requires both backend validation and appropriate frontend validation.

The backend is authoritative for:

- inventory;
- coupon eligibility;
- payment state;
- order creation;
- authorization;
- final pricing;
- server-enforced personalization constraints.

Frontend validation improves UX but must not be considered the security boundary.

No specific form/validation library should be introduced without an approved project decision if one is not already present.

## 12. Error Handling

User-facing errors must be understandable and non-technical.

Never show:

- stack traces;
- SQL/database messages;
- raw provider exceptions;
- internal endpoint details.

Distinguish where relevant:

- loading;
- empty;
- validation error;
- recoverable request error;
- not found;
- payment failure;
- unexpected application error.

The approved checkout flow includes a dedicated payment-failure route/state with retry and return-to-cart actions.

## 13. SEO and Metadata

Use Next.js metadata APIs.

The project has already established the concepts of:

- `metadataBase`;
- canonical URLs;
- locale alternate URLs;
- site URL environment configuration.

Agents must reuse that strategy rather than rebuilding SEO links manually per feature.

For product/category routes, metadata should be derived from route data and remain stable/shareable.

## 14. Environment Configuration

Environment variables are divided by exposure, not convenience.

### Server-only
Use normal environment variables for values that must remain private.

### Browser-readable
Only use `NEXT_PUBLIC_*` when browser JavaScript genuinely needs the value.
These values are public by definition.

Project files:

- `.env.local` → local developer values/secrets; never commit.
- `.env.example` → committed list of required variables with safe placeholders.
- `.env` → only use if the team intentionally adopts a shared non-secret environment baseline; do not duplicate `.env.local` blindly.

## 15. Styling / Design Architecture

Implementation must consume the approved Rafal design system rather than create one per feature.

See `docs/DESIGN_SYSTEM.md`.

No new styling framework/component library is authorized here. Use the repository's established styling approach.

## 16. Testing Strategy

Use the repository's installed test stack. Do not introduce a second test framework without approval.

Testing priority:

1. business-critical pure logic;
2. reusable components with meaningful states;
3. feature interactions;
4. critical journeys (location, cart, checkout, auth) with integration/E2E coverage as the project test infrastructure matures.

Avoid tests that merely assert implementation details.

## 17. Performance

Architectural performance rules:

- default to Server Components;
- minimize client boundaries;
- avoid large dependency additions for small UI needs;
- avoid serial data waterfalls when requests are independent;
- use image/font optimization provided by Next.js where appropriate;
- maintain stable UI dimensions to avoid layout shift;
- measure before adding complex caching.

## 18. Security

- secrets never enter browser bundles;
- backend authorization is authoritative;
- payment details are handled through the approved payment-provider architecture;
- sanitize or safely render CMS rich text based on the defined trust boundary;
- do not trust query parameters/local storage for protected identity or pricing;
- do not log OTPs, tokens, or sensitive user information.

## 19. Decisions Not Yet Authorized

Unless already present in the repository, the following remain explicit decisions rather than agent choices:

- global client state library;
- client data caching library;
- form library;
- schema validation library;
- component library;
- CSS/styling framework changes;
- BFF/API gateway inside Next.js;
- universal Server Actions strategy;
- persistent cart storage mechanism;
- location persistence mechanism;
- authentication token/session storage mechanism;
- analytics platform;
- error-reporting vendor;
- testing framework changes.

When one becomes necessary, create an ADR before establishing it as a project-wide pattern.
