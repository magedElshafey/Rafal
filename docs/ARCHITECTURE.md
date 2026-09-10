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

### Carousel foundation

- `AppCarousel` is the canonical storefront carousel primitive.
- Embla Carousel is the approved headless interaction engine behind that primitive.
- Feature modules configure and compose `AppCarousel`; they do not import Embla directly.

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

1\. server/request data;

2\. URL state;

3\. local component state;

4\. lifted feature state/context when multiple children genuinely share it;

5\. global client store only after an explicit architecture decision.

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

    ui/              # reusable design-system primitives

  features/

    <feature>/

      components/

      api/

      types/

      utils/

      hooks/          # only when client hooks are truly needed

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

Native `fetch` is the approved HTTP transport for the storefront. Do not add Axios, Ky, ofetch, React Query, SWR, or another data-fetching layer without an approved architecture decision.

Default request placement:

- Server Components/server-side modules fetch server-readable page data through the approved server API client and call Laravel directly.
- Do not route Server Component reads through a Next.js Route Handler merely to proxy Laravel; that adds an unnecessary HTTP hop.
- Client-side fetching is reserved for browser interactions that happen after hydration, such as autocomplete or interaction-driven refreshes.
- Browser-to-Next server mediation is allowed only when a concrete server boundary is required, for example server-only credentials/session handling, aggregation, or another explicitly approved reason. It is not the default for every endpoint.

The request location is chosen by runtime need, not by HTTP method alone. A `GET` may still be client-side when it is triggered by browser interaction.

Before adding a client data cache such as TanStack Query/SWR, write an Architecture Decision Request explaining why the current primitives are insufficient.

## 8. Mutation Strategy

Laravel remains authoritative for commerce/business mutations. The web application must not duplicate backend business rules.

For each mutation, preserve:

- typed input;
- validation boundary;
- explicit pending state;
- explicit success/failure behavior;
- user-safe error messages;
- cache/revalidation behavior where relevant.

Mutation transport is chosen per feature based on the backend authentication/session contract:

- use direct client-to-Laravel calls only when the browser-facing contract is intentionally supported and safe;
- use a Server Action or another approved Next.js server boundary when server mediation is actually required;
- do not introduce a permanent BFF/proxy pattern across the application without a separate ADR.

The shared HTTP client must not automatically retry `POST`, `PUT`, `PATCH`, or `DELETE`. Mutations may have side effects and blind retry can duplicate orders, payments, cart operations, or other state changes. Any mutation-specific idempotency/retry behavior must be supported by the backend contract and explicitly designed.

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

Create feature-oriented API functions rather than making ad-hoc requests deep inside route or presentational components.

Preferred boundary:

```text
component / page
    -> feature API function
        -> serverApi | clientApi
            -> shared HTTP client
                -> Laravel contract
```

### 10.1 Approved HTTP client structure

Cross-feature HTTP infrastructure lives under `src/lib/api/`:

```text
src/lib/api/
  http-client.ts   # runtime-neutral HTTP core
  api-error.ts     # normalized API error type
  server-api.ts    # server runtime configuration
  client-api.ts    # browser runtime configuration/factory
```

Feature endpoint ownership remains under the relevant feature, for example:

```text
src/features/products/api/
src/features/cart/api/
src/features/auth/api/
```

Do not create one giant endpoint/service file for unrelated domains.

### 10.2 Shared HTTP core responsibilities

`createHttpClient()` is the single shared request engine. It may own:

- base URL composition;
- HTTP method;
- common/default/request-specific header merging;
- JSON request serialization;
- query-parameter serialization;
- successful JSON parsing;
- `204 No Content` handling;
- normalized HTTP errors;
- `AbortSignal` cancellation;
- request timeout;
- the approved read-only retry policy.

The shared HTTP core must remain runtime-neutral. It must not import or directly depend on:

- `next/headers`;
- Next.js cookies;
- `next-intl`;
- `window`;
- `localStorage`;
- browser-only or server-only credentials.

Runtime-specific values are injected by `server-api.ts` or `client-api.ts`.

### 10.3 Locale headers

The standard locale request header is `Accept-Language`.

- Server API configuration resolves locale through the established `next-intl` server API such as `getLocale()`.
- Client code resolves locale through `useLocale()` and passes that locale into the client API factory/configuration.
- Do not hard-code `ar` inside the shared HTTP client.
- Do not create feature-specific locale unions; supported locales have one source of truth in the i18n configuration.

### 10.4 Authentication headers

Authorization/session data is dynamic user context, not a static HTTP-core default.

Do not hard-code `Authorization: Bearer ...` inside `http-client.ts`. The final token/cookie/session injection strategy must follow the Laravel authentication contract once it is delivered. Secrets must remain server-only.

### 10.5 Error contract

HTTP responses with non-success status are normalized to `ApiError`, which carries the HTTP/application information needed by higher layers, such as:

- `status`;
- `message`;
- optional `code`;
- optional `details`.

The HTTP client reports what happened. It must not decide presentation/application behavior such as:

- logout;
- redirect;
- `notFound()`;
- forbidden navigation;
- toast rendering.

Those decisions belong to the relevant auth/page/feature/application layer because the same HTTP status can require different UX in different contexts.

### 10.6 Timeout and cancellation

The approved client supports both:

- manual cancellation through a caller-provided `AbortSignal`;
- an internal request timeout (currently a 10-second default unless a request overrides it).

These concerns are different: manual cancellation means the request is no longer needed; timeout means the request exceeded the allowed wait. Aborted/timeout requests are not automatically retried by the shared policy.

### 10.7 Read retry policy

Automatic retry is intentionally conservative:

- only `GET` is retryable by the shared client;
- default maximum additional retries: 2;
- retryable HTTP statuses: `408`, `429`, `500`, `502`, `503`, `504`;
- retry network failures where no HTTP response was received;
- use exponential backoff starting at approximately 500ms;
- do not retry manual aborts/timeouts;
- do not retry known `ApiError` values after the policy has decided they are terminal.

If the backend later exposes `Retry-After` or idempotency guarantees, extend the policy deliberately rather than silently changing behavior.

### 10.8 Query parameters

The HTTP client owns generic query-string serialization. Feature APIs pass typed query values; components do not hand-build URLs.

Current generic array serialization may use repeated keys (`?category=1&category=2`) until the Laravel contract specifies the authoritative array format. Once defined, change serialization centrally rather than per feature.

### 10.9 Temporary backend contract mocking

A temporary development mock is allowed while the Laravel API is documented but not deployed. This is a **mock backend boundary**, not a production BFF architecture.

Rules:

- The real Laravel API contract/documentation is authoritative.
- Prefer a contract-generated/mock server from the backend OpenAPI/Swagger specification when such a specification exists; this gives the strongest protection against drift.
- If no executable API specification exists yet, isolated development-only Next.js Route Handlers may mirror documented endpoints, but they must be clearly marked as mock-only and contain no new business rules.
- Components and feature API functions must not import mock fixtures directly. They continue to call the same API/domain functions used for the real backend.
- Endpoint paths, methods, request DTOs, response DTOs, status codes, and documented error shapes must match the Laravel contract.
- Do not invent undocumented backend fields just to unblock UI. Raise a contract question instead.
- The mock must be replaceable by environment/configuration change plus deletion of the mock implementation; feature/UI code should not require a rewrite.
- Do not call the temporary mock a BFF and do not allow it to evolve into a permanent proxy without a separate ADR.

A hand-written mock cannot be claimed to match the backend “100%” unless both are generated/validated from the same executable contract (for example OpenAPI). Treat examples-only documentation as a drift risk.

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

Use normal environment variables for values that must remain private. Server-only configuration lives in `src/config/server-env.ts`, which must be protected by `import "server-only"`.

Current server configuration includes:

- `SITE_URL` — canonical storefront origin;
- `API_BASE_URL` — Laravel/mock API base URL used by server-side requests.

### Browser-readable

Only use `NEXT_PUBLIC_*` when browser JavaScript genuinely needs the value. These values are public by definition. Browser-readable configuration lives in `src/config/client-env.ts`.

Current browser API configuration may include:

- `NEXT_PUBLIC_API_BASE_URL` — API origin used only by approved direct browser API calls.

Do not place secrets, private tokens, or server credentials in `NEXT_PUBLIC_*`.

### Configuration boundaries

- `http-client.ts` does not import environment modules.
- `server-api.ts` receives `serverEnv.apiBaseUrl`.
- `client-api.ts` receives `clientEnv.apiBaseUrl`.
- Do not create a single mixed env object that imports server-only values into client code.
- Validate required URL environment variables centrally and fail clearly on missing/invalid absolute URLs.

Project files:

- `.env.local` -> local developer values/secrets; never commit.
- `.env.example` -> committed list of required variables with safe placeholders.
- `.env` -> only use if the team intentionally adopts a shared non-secret environment baseline; do not duplicate `.env.local` blindly.

## 15. Styling / Design Architecture

Implementation must consume the approved Rafal design system rather than create one per feature.

See `docs/DESIGN_SYSTEM.md`.

Tailwind CSS v4 remains the styling engine. shadcn/ui is authorized as an

implementation foundation for reusable primitives, not as the visual source of

truth or a replacement styling system. Generated components must be adapted to

the Rafal tokens and approved Figma design.

Use the centralized `cn()` helper for class composition. CVA is authorized only

for reusable components with meaningful variants. Phosphor Icons is the sole

general-purpose icon system; do not introduce Lucide. Shared design-system

primitives belong in `src/components/ui/` and remain Server Components unless a

concrete browser-side requirement needs a client boundary.

## 16. Testing Strategy

Use the repository's installed test stack. Do not introduce a second test framework without approval.

Testing priority:

1\. business-critical pure logic;

2\. reusable components with meaningful states;

3\. feature interactions;

4\. critical journeys (location, cart, checkout, auth) with integration/E2E coverage as the project test infrastructure matures.

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
- component libraries other than the approved shadcn/ui implementation foundation;
- CSS/styling framework changes;
- permanent BFF/API gateway inside Next.js;
- universal Server Actions strategy;
- persistent cart storage mechanism;
- location persistence mechanism;
- authentication token/session storage mechanism;
- analytics platform;
- error-reporting vendor;
- testing framework changes.

The native-fetch HTTP client, runtime-specific API adapters, `ApiError`, generic query serialization, timeout/cancellation behavior, conservative GET retry policy, and temporary contract-mock boundary described in Section 10 are approved and are no longer open agent decisions.

When an unauthorized decision becomes necessary, create an ADR/Architecture Decision Request before establishing it as a project-wide pattern.
