# ADR-001 — Storefront HTTP API Layer and Temporary Contract Mocking

## Status

Accepted for the current Rafal storefront implementation.

## Context

The Rafal web storefront is a Next.js App Router application that consumes a separate Laravel backend. Backend API documentation is being prepared while the deployed API is not yet available. Frontend feature work must continue without coupling UI code to temporary mock implementation details or requiring a rewrite when Laravel becomes reachable.

## Decision

1. Use native `fetch` as the HTTP transport.
2. Centralize generic HTTP behavior in `src/lib/api/http-client.ts` through `createHttpClient()`.
3. Keep the HTTP core runtime-neutral.
4. Configure server/browser runtimes separately through `server-api.ts` and `client-api.ts`.
5. Keep endpoint ownership inside feature API modules.
6. Normalize non-success HTTP responses to `ApiError`; higher layers own logout/navigation/toast/UX decisions.
7. Support generic query serialization, JSON parsing, `204`, caller cancellation, a default timeout, and conservative automatic retries for `GET` only.
8. Inject `Accept-Language` dynamically from `next-intl`; do not hard-code locale in the transport core.
9. Do not define the Authorization/session mechanism until the Laravel authentication contract is explicit.
10. While Laravel is unavailable, use a development-only contract mock rather than introducing a production BFF. Prefer an executable OpenAPI/Swagger-backed mock when possible; otherwise use isolated mock Route Handlers that mirror the documented contract and contain no business logic.

## Why not a temporary BFF?

A BFF is a production architectural boundary that intentionally mediates browser/backend communication. Building one only to delete it creates the wrong ownership model and risks letting temporary transformation/session/business logic leak into Next.js. The current need is backend substitution, not frontend-specific backend orchestration.

A contract mock lets the same feature API functions and DTOs remain in place while only the configured backend target changes.

## Trade-offs

### Benefits

- feature/UI code can progress before backend deployment;
- the same API boundary is exercised during mock and real integration;
- base URLs, error handling, locale headers, cancellation, and retry rules remain centralized;
- server/client runtime concerns remain explicit;
- mock removal should be configuration/deletion work rather than feature rewrite.

### Costs / risks

- a hand-written mock can drift from Laravel;
- mock success does not prove real integration success;
- authentication/cookie/CORS behavior cannot be fully validated until the real backend is available;
- temporary Next Route Handlers add an extra HTTP hop and therefore are development substitution only.

## Contract-drift rule

Do not claim a hand-written mock is “100% identical” to Laravel unless both are generated or validated from the same executable API contract. If an OpenAPI specification becomes available, it becomes the preferred source for mock generation/validation.

## Consequences

- Server-rendered production reads call Laravel directly through `serverApi`; they do not route through a permanent Next proxy.
- Client interactions use `clientApi` or an explicitly approved server boundary depending on the final auth/session contract.
- No Axios/client-cache library is introduced by this decision.
- Automatic mutation retries remain prohibited unless the backend provides explicit idempotency semantics.
- The temporary mock must never become the source of truth for business behavior.
