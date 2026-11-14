# Rafal Storefront — Loyalty Implementation Reference Pack

**Project:** Separate Next.js Storefront repository (NOT Vite Dashboard). **Evidence date:** 2026-11-14. **Status:** Ready for scoped code audit and implementation planning; integration QA not complete.

## Read in this order

1. `00-START-HERE.md` — requirements priority, boundaries and decisions.
2. `01-user-stories-source.md` — **full original user-supplied stories**; preserve acceptance criteria.
3. `03-verified-api-contracts.md` — independently tested Postman observations, actual fields, outcomes.
4. `04-lifecycle-evidence.md` — exact order chronology and unresolved quirks.
5. `05-design-map-and-quality-bar.md` — all image filenames, design interpretation, responsive/a11y/performance expectations.
6. `06-gaps-and-acceptance-checklist.md` — known unknowns, QA priorities and delivery acceptance.
7. `02-provided-api-examples-original.md` — original full user-supplied sample responses (reference, not guaranteed live).
8. `fixtures/` — *selected fields* from real Postman responses for each lifecycle state, not complete responses. See original examples and actual repo for full schemas.

## Authoritative precedence

Current user-confirmed decisions and **actual Postman responses** > user-supplied story descriptions > supplied design screenshot visuals > existing app implementation for established patterns. Conflicts must be highlighted, not silently resolved. Old BRD/PDF and stale Postman collection are **NOT** sources of truth. If any story references BRD, treat that as unresolved cross-reference, not permission to read old BRD.

Screenshots are under `../../../design/loyalty/` relative to repository root if copied as `docs/reference/loyalty` + `design/loyalty`.

No credentials, personal customer identifiers or payment-session URL are included in fixtures.
