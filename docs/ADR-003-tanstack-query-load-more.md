# ADR-003: TanStack Query for Load-More Listings

## Status

Approved by the reusable load-more pagination change request.

## Problem

Storefront listings need to append API pages after hydration while preserving
already-rendered items, preventing duplicate requests, and distinguishing an
initial failure from a later-page failure. The same behavior will be needed by
products, category results, search, offers, and blogs as their contracts arrive.

## Current constraint

Server Components remain the default for initial, SEO-relevant reads. Feature
API modules must continue to use `serverApi` or `createClientApi`; the shared
native-fetch HTTP client remains the transport and owns GET retry behavior.

## Options considered

1. Manage page numbers, request state, and accumulated items with local React
   state. This duplicates pagination state and request coordination in every
   feature.
2. Render numbered pages through URL search parameters. This is suitable for
   shareable numbered pagination but does not implement the approved load-more
   interaction.
3. Use TanStack React Query infinite queries at a narrow client boundary, with
   the first page fetched on the server and hydrated into the query cache.

## Decision

Use `@tanstack/react-query` and `useInfiniteQuery` for interaction-driven
load-more listings. Server Components fetch page 1 and hydrate an
`InfiniteData` value under the same feature-owned query key used in the browser.
API pagination metadata determines the next page; no parallel page or `hasMore`
state is stored in React.

Query keys must include every non-page input that changes the collection. Page
numbers belong to `pageParam`, not the query key. Feature query functions use
the existing API adapters and forward TanStack's `AbortSignal`.

The shared `LoadMoreButton` is presentation-only and composes the canonical
`Button`. Feature components own endpoint knowledge, data flattening, and error
copy. A later-page error keeps cached pages visible and exposes an explicit
retry action.

React Query retries are disabled for queries whose requests already use the
shared HTTP client's approved GET retry policy, preventing compounded retries.

## Consequences

- Initial listing content remains server-rendered and avoids a duplicate page-1
  browser request during the configured freshness window.
- Loaded pages remain in the browser cache and append without extra local state.
- The application has one stable `QueryClientProvider` client boundary.
- Each new listing still requires its own typed API contract, complete query
  key, mapper where needed, rendering component, and localized states.
- This decision does not authorize TanStack Query for unrelated server reads,
  mutations, or broad application state.

## Initial implementation

The categories route is the reference integration because categories are the
only existing feature with a real collection DTO (`data`). Its query key
currently includes locale, the only non-page input accepted by that endpoint.
Future category filters, sorting, location, or warehouse inputs must be added to
the key and request together if the backend contract introduces them.
