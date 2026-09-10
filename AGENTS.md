# AGENTS.md — Rafal Web Storefront

This file defines the operating contract for Codex and any coding agent working on the Rafal storefront repository.

The agent is an **implementation assistant**, not the architecture owner.

## 1. Core Rule

Do not make new architecture, product, API-contract, routing, state-management, authentication, localization, design-system, or dependency decisions silently.

Before implementing a task, read the project docs in this order:

1\. `docs/PROJECT.md`

2\. `docs/ARCHITECTURE.md`

3\. `docs/DESIGN_SYSTEM.md`

4\. The task / issue / acceptance criteria

5\. Existing code in the affected feature

If the task conflicts with these documents, stop and report the conflict instead of choosing a new direction.

---

## 2. Source of Truth Priority

When sources disagree, use this priority:

1\. Explicit approved task / change request for the current work

2\. BRD v0.4 and approved change requests incorporated into it

3\. Approved Figma design / prototype

4\. `docs/ARCHITECTURE.md`

5\. `docs/DESIGN_SYSTEM.md`

6\. Existing production code

7\. Agent assumptions — **never authoritative**

Do not infer missing business requirements from UI alone.

Do not infer missing UI rules from the BRD alone.

---

## 3. Scope Discipline

Rafal is being delivered in phases. Do not implement Phase 2 behavior inside Phase 1 unless a task explicitly asks for it.

For the MVP storefront, preserve these business constraints:

- Primary language: Arabic.

- Full RTL support.

- Primary currency: SAR.

- Prices are presented VAT-inclusive where required by product requirements.

- Guest users can browse, add to cart, and complete checkout.

- Authentication is passwordless and based on email + OTP.

- Product availability is location/warehouse dependent.

- User-selected city/location affects the warehouse and available products.

- Product personalization by name is a core product capability.

- The storefront must be responsive and mobile-first.

- Basic SEO is required for product and category pages.

Do not implement real Tabby/Tamara PDP API integration from the informational BNPL section unless a later approved scope explicitly requires it.

---

## 4. Architecture Boundaries

Follow `docs/ARCHITECTURE.md` exactly.

### Agent must not independently:

- replace Next.js App Router conventions;
- introduce another routing system;
- replace `next-intl`;
- introduce a global state library;
- introduce a client data-fetching/cache library;
- introduce a form library;
- introduce a component library beyond the approved foundation;
- introduce a CSS framework or styling system;
- introduce a new validation strategy;
- create a permanent API proxy/BFF/gateway;
- change authentication/session architecture;
- change folder ownership boundaries;
- add a dependency because it is convenient;
- move a Server Component to Client Component without a concrete browser-side requirement;
- expose server-only environment variables to the browser;
- replace or bypass the approved `src/lib/api` HTTP infrastructure;
- add automatic mutation retries.

The development-only contract mock described in `docs/ARCHITECTURE.md` is the only approved Route-Handler/mock exception while Laravel is not deployed. It must not acquire business logic or become a permanent BFF.

If a new architecture decision is needed, produce an **Architecture Decision Request** containing:

- problem;
- current constraint;
- options considered;
- trade-offs;
- recommended option;
- files/features affected.

Wait for approval before implementing the architectural change.

---

## 5. Implementation Workflow

For every non-trivial task:

### A. Understand

- Restate the goal in technical terms.

- Identify the relevant BRD feature / Figma screen / acceptance criteria.

- Identify affected routes, components, types, API calls, translations, tests, and states.

### B. Inspect

- Inspect the current implementation before editing.

- Reuse existing project patterns.

- Search for an existing component/token/helper before creating another one.

### C. Plan

Provide a short implementation plan before large edits.

### D. Implement

- Make the smallest coherent change that satisfies the task.

- Keep business rules outside purely presentational components.

- Keep reusable UI free from feature-specific business logic.

- Preserve server/client boundaries.

### E. Verify

At minimum, run the project checks that exist in the repository, such as:

- lint;

- TypeScript/typecheck;

- relevant unit/component tests;

- relevant integration/E2E tests;

- production build when the change affects routing, metadata, server behavior, or configuration.

Do not claim checks passed if they were not run.

### F. Report

Summarize:

- what changed;

- why it changed;

- files changed;

- checks run;

- unresolved questions/risks.

---

## 6. Server vs Client Components

Default to Server Components.

Use a Client Component only when the component needs browser/client behavior such as:

- event handlers;

- local interactive state;

- browser APIs;

- client-only hooks;

- interactive third-party libraries.

Keep the client boundary as low in the component tree as practical.

Do not add `"use client"` to layouts/pages merely to make implementation easier.

---

## 7. Data and API Rules

The backend is a separate Laravel system and integrations include Odoo, payment, shipping, OTP/email services. Laravel remains authoritative for domain/business behavior.

### Approved request architecture

Use the existing API layers instead of ad-hoc network code:

```text
feature API function
  -> serverApi | clientApi
    -> createHttpClient()
      -> Laravel / approved development mock
```

Rules:

- Use native `fetch` only through the approved shared HTTP infrastructure for application API calls unless an explicit task requires otherwise.
- Do not add Axios/Ky/ofetch or another HTTP client.
- Do not call raw `fetch()` from arbitrary presentational components.
- Server Components/server-side modules call Laravel directly through `serverApi`; do not proxy those reads through Next Route Handlers.
- Client-side requests are only for genuine browser interactions or a specifically approved browser-facing API flow.
- Do not independently choose direct-browser vs Server Action/server mediation for auth/session-sensitive mutations before the backend auth contract is explicit.
- Keep endpoint ownership feature-oriented (`features/<feature>/api`). Do not create a giant cross-domain endpoint file.
- Type request/response DTOs. Do not invent response fields.
- Create adapters/mappers when API DTOs materially differ from UI/domain needs; do not add ceremonial mapping for trivial pass-through shapes.

### HTTP client behavior

Preserve the project conventions in `src/lib/api/http-client.ts`:

- centralized base URL composition;
- generic query serialization;
- JSON body/response handling and `204` support;
- dynamic default headers plus request-specific headers;
- `AbortSignal` cancellation;
- default request timeout;
- normalized `ApiError`;
- automatic retry only for approved `GET` failures;
- no blind retry for `POST`, `PUT`, `PATCH`, or `DELETE`.

Do not silently change retry count/statuses/backoff/timeout policy across features. If a feature needs an exception, make it explicit and explain why.

### Locale and auth headers

- Send the standard `Accept-Language` header using the current `next-intl` locale.
- Server locale comes from the established server i18n API (for example `getLocale()`).
- Client locale comes from `useLocale()` and is passed into client API creation/configuration.
- Do not hard-code `ar` in the shared HTTP layer.
- Do not hard-code an `Authorization: Bearer ...` strategy until the Laravel auth/session contract is approved.
- Never place secrets in browser-readable configuration.

### Error ownership

`ApiError` describes the failure; it does not own application navigation/presentation.

Do not put these inside the shared HTTP client:

- logout;
- redirects;
- `notFound()`;
- forbidden-page navigation;
- toasts.

Handle status meaning in the relevant auth/page/feature layer because the same status can have different UX depending on context. Never expose raw backend/database errors to users.

### Temporary contract mock

While Laravel is documented but not deployed, the approved development mock may be used only as described in `docs/ARCHITECTURE.md`.

- Treat Laravel docs/OpenAPI as authoritative.
- Prefer an executable OpenAPI/Swagger-backed mock when available.
- If temporary Next Route Handlers are used, keep them under an explicit mock-only boundary and out of production architecture.
- Match documented path, method, request/response DTO, status code, and error shape.
- Do not import fixture/mock data directly into UI or feature components.
- Do not invent missing contract fields to make screens easier to build.
- Switching from mock to real Laravel must not require rewriting feature/UI code.

If an API contract is missing or ambiguous, raise a contract question instead of guessing.

---

## 8. Localization Rules

`next-intl` is the localization solution for the storefront.

- Arabic is the Phase 1 primary locale.

- RTL must work at document/layout level, not through one-off component hacks.

- User-facing strings must not be hard-coded inside reusable UI when they belong in translations.

- Route/metadata behavior must remain compatible with the established localization setup.

- Do not redesign the locale URL strategy without an approved architecture decision.

Phase 2 will add broader multilingual requirements. Phase 1 code should avoid unnecessary assumptions that make expansion difficult, but do not implement Phase 2 early.

---

## 9. SEO Rules

For indexable storefront routes:

- use Next.js metadata APIs;

- preserve the project's `metadataBase` / canonical / alternate strategy;

- use clean, stable URLs;

- product/category metadata must be generated from real page data when available;

- do not duplicate canonical strategy in components.

Never hard-code a deployment origin if the project already provides the canonical site URL through configuration.

---

## 10. Environment Variables

- Server-only values must not use `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_*` values are browser-readable and must never contain secrets.
- Server environment configuration belongs in `src/config/server-env.ts` and must remain protected by `import "server-only"`.
- Browser-safe environment configuration belongs in `src/config/client-env.ts`.
- `src/lib/api/http-client.ts` must not import either environment module directly.
- `server-api.ts` receives the server API base URL; `client-api.ts` receives the browser-safe API base URL.
- Reuse the established `SITE_URL`, `API_BASE_URL`, and `NEXT_PUBLIC_API_BASE_URL` meanings; do not create overlapping aliases.
- `.env.local` is for developer-local values and secrets and must not be committed.
- `.env.example` documents required variable names with safe placeholder values.
- Validate required URL configuration centrally and fail clearly if an absolute URL is missing/invalid.

---

## 11. Design System Rules

Follow `docs/DESIGN_SYSTEM.md` and approved Figma.

- Do not eyeball colors, radii, shadows, typography, spacing, or breakpoints when a token/component exists.

- Do not create a near-duplicate component because it is faster.

- Prefer composition and variants over copy/paste.

- Preserve accessibility states: keyboard, focus, disabled, error, selected, loading.

- If Figma requires a value that is not documented in code/docs, flag it instead of creating a new token silently.

---

## 12. Accessibility

Every implementation must preserve semantic HTML and keyboard usability.

At minimum:

- interactive controls use the correct element;

- visible focus is preserved;

- form controls have accessible labels;

- validation errors are understandable;

- images have appropriate alt behavior;

- dialogs/sheets are keyboard and focus managed;

- color is not the only communication channel.

Do not trade accessibility for pixel matching.

---

## 13. Performance

The BRD requires storefront pages to load within the agreed performance target under normal conditions.

Prefer:

- Server Components for non-interactive content;

- Next.js image/font primitives where appropriate;

- minimal client JavaScript;

- code splitting through route/component boundaries;

- avoiding unnecessary client-side waterfalls;

- stable dimensions to reduce layout shift.

Do not add premature caching or optimization layers without evidence.

---

## 14. Security

- Never commit secrets.

- Never expose raw internal errors to users.

- Do not trust client-side validation for security-sensitive rules.

- Do not render unsanitized rich content when its trust boundary is unknown.

- Do not build payment-card handling that bypasses the approved payment provider flow.

- Treat authorization as a backend-enforced concern; frontend permissions improve UX but are not a security boundary.

---

## 15. Change Control

If a requested behavior is not in the approved BRD/Figma/task and changes product scope, label it as a **Scope Question** rather than implementing it.

If a requested implementation changes an established technical decision, label it as an **Architecture Decision Request**.

Agents are encouraged to improve code quality inside existing boundaries, but not to expand scope or architecture autonomously.

## 16. Breadcrumb Rule

All breadcrumb navigation in the Rafal storefront MUST use the shared canonical `Breadcrumbs` component at `src/components/ui/breadcrumbs.tsx`.

Do not create page-specific breadcrumb markup or duplicate breadcrumb styling.

For static routes, pass static breadcrumb items to the shared component. For dynamic routes, resolve dynamic labels in the page/server/domain layer and pass the resolved items to the shared component.

The `Breadcrumbs` component must remain domain-agnostic and must not fetch product, category, blog, CMS, or other business data itself.

Do not derive user-facing dynamic labels by blindly parsing `pathname` segments.

Keep breadcrumbs server-rendered whenever possible and do not introduce a client boundary solely for breadcrumb navigation.

Reuse the project's established localization-aware `Link` from `src/i18n/navigation.ts`.

Any future breadcrumb implementation must extend or reuse the canonical component rather than creating an alternative breadcrumb system.

_<!-- BEGIN\:nextjs-agent-rules -->_

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

_<!-- END\:nextjs-agent-rules -->_

## Frontend architecture rules

### Internationalization

- Locale is an application-level i18n concern, never a feature-specific type.

- Use the locale type configured through `next-intl`; do not create `CityLocale`, `BlogLocale`, `ProductLocale`, or equivalent `"ar" | "en"` unions.

- Supported locales must have one source of truth in the i18n configuration.

- Do not add locale resolver/narrowing helpers when the type can be fixed at the i18n boundary.

### API implementation guardrails

- `src/lib/api/http-client.ts` is the runtime-neutral transport core; do not import `next-intl`, cookies, `next/headers`, `window`, or `localStorage` into it.
- `server-api.ts` and `client-api.ts` are runtime adapters/configuration boundaries, not feature endpoint collections.
- Feature API modules own endpoint paths and request/response DTOs.
- Do not hand-build query strings in components when the shared client already supports `query`.
- Do not bypass `ApiError` by creating unrelated per-feature HTTP error classes unless the feature has a genuinely different domain error model.
- Manual cancellation is caller-owned through `AbortSignal`; autocomplete/effect cleanup should cancel stale requests when appropriate.
- A Server Component must never call the temporary Next mock through a production-style BFF abstraction; the mock is development substitution only.

### Carousel implementation

- All storefront carousel implementations must reuse the canonical `AppCarousel` primitive in `src/components/ui/app-carousel.tsx`.
- Do not introduce another carousel package or create feature-specific Embla implementations unless an approved architecture decision explicitly requires it.
- Feature modules must not import Embla directly; Embla integration is owned by `AppCarousel`.

### Next.js server boundaries

- Prefer Server Actions for web-only mutations/side effects triggered by the Next.js UI when server execution is required.

- Do not create Route Handlers when no HTTP API boundary is actually needed.

- Laravel remains the source of truth for domain/business logic. Do not duplicate business rules in Next.js.

- Browser-provided values, including cookies, are untrusted inputs.

- Do not call `router.refresh`, `revalidatePath`, or `revalidateTag` automatically after mutations; first verify that the current rendering/cache behavior requires it.
