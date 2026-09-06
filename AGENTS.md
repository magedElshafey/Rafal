# AGENTS.md — Rafal Web Storefront

This file defines the operating contract for Codex and any coding agent working on the Rafal storefront repository.

The agent is an **implementation assistant**, not the architecture owner.

## 1. Core Rule

Do not make new architecture, product, API-contract, routing, state-management, authentication, localization, design-system, or dependency decisions silently.

Before implementing a task, read the project docs in this order:

1. `docs/PROJECT.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DESIGN_SYSTEM.md`
4. The task / issue / acceptance criteria
5. Existing code in the affected feature

If the task conflicts with these documents, stop and report the conflict instead of choosing a new direction.

---

## 2. Source of Truth Priority

When sources disagree, use this priority:

1. Explicit approved task / change request for the current work
2. BRD v0.4 and approved change requests incorporated into it
3. Approved Figma design / prototype
4. `docs/ARCHITECTURE.md`
5. `docs/DESIGN_SYSTEM.md`
6. Existing production code
7. Agent assumptions — **never authoritative**

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
- introduce a data-fetching library;
- introduce a form library;
- introduce a component library;
- introduce a CSS framework or styling system;
- introduce a new validation strategy;
- create a custom API proxy/BFF layer;
- change authentication/session architecture;
- change folder ownership boundaries;
- add a dependency because it is convenient;
- move a Server Component to Client Component without a concrete browser-side requirement;
- expose server-only environment variables to the browser.

If one of these is needed, produce an **Architecture Decision Request** in the task response containing:

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

The backend is a separate Laravel system and integrations include Odoo, payment, shipping, OTP/email services.

Frontend rules:

- Treat backend API contracts as external contracts.
- Do not invent response fields.
- Do not silently normalize inconsistent API contracts across unrelated features.
- Create typed adapters/mappers when API DTOs differ from UI/domain needs.
- Represent loading, empty, error, and success states explicitly where the UX requires them.
- Never expose raw backend/database errors to users.
- Keep sensitive credentials server-only.

If an API contract is missing, mock only when the task explicitly allows it and mark the mock boundary clearly.

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
- `.env.local` is for developer-local values and secrets and must not be committed.
- `.env.example` documents required variable names with safe placeholder values.
- Do not create duplicate variables with overlapping purposes.
- Reuse the project's established site URL variable conventions.

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
