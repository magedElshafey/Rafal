# City Context

## Browsing city and fulfillment destination

Rafal has two distinct city concepts.

- **Browsing City** controls catalogue and Home product data, listing/search
  filtering, PDP availability, the ordinary Cart projection, and Add to Cart.
- **Fulfillment Destination** belongs to Checkout. A saved address, one-time
  address, or persisted Gift recipient remains authoritative for Checkout quote
  and placement. Changing Browsing City does not rewrite that destination.

## Authority and ownership

The server-confirmed `rafal_guest_city_id` cookie is the durable Browsing City
authority. Server Components resolve it through `resolveCurrentLocation()`.
The storefront's `BrowsingCityProvider` is a narrow client coordinator for the
temporary transition only. It is not another durable city store and does not own
commerce data or expose the QueryClient.

The Server storefront layout remains a Server Component. It resolves the current
city and passes the serializable `City | null` value into the provider, which wraps
the existing storefront shell and route content. All picker surfaces consume that
single transition owner.

## Transition lifecycle

```text
idle(A)
  -> persisting(A -> B)
  -> syncing(B)
  -> idle(B)
```

During `persisting`, A remains the committed and displayed city. The pending B is
shown only as transition feedback. A successful Server Action cookie write moves
the client mirror to B and starts `syncing`; it does not claim that rendered
city-dependent data has already updated.

The provider calls `router.refresh()` after persistence. A later `serverCity` prop
whose ID equals the expected target is the RSC synchronization acknowledgement and
finishes the transition. While a target is expected, an older server render with a
different city cannot overwrite it. Async persistence completions also carry a
monotonic generation and cannot finish a newer transition.

During `syncing`, the Header keeps its existing transition status and a lightweight,
non-blocking Storefront Sync Veil appears only over the route-content boundary. The
current rendered content remains visible and mounted underneath until the refreshed
RSC payload arrives. The veil is visual feedback only: it does not intercept input,
disable controls, or make commerce mutations safe. Actual mutation protection remains
Phase B scope.

## Failure semantics

- Persistence failure keeps the previous committed city, clears the pending target,
  publishes no Cart notification, performs no target refresh, and exposes localized
  recoverable feedback.
- Once persistence succeeds, the new cookie-backed city remains committed. A later
  region/query failure does not automatically write the former city back; the
  affected region owns its error and retry experience.

Persistence is never silently retried.

## Cart compatibility bridge

`rafal:browsing-city-selected` remains a compatibility notification for the current
Cart listener. The coordinator emits it only after the cookie write succeeds. Cart
projection work and `router.refresh()` then proceed independently; the global
transition does not wait for TanStack Query. Cart continues to own canonical Cart
identity and destination-city availability readiness.

## Scope boundary

There is no universal client city store, Redux/Zustand state, localStorage city, or
global commerce store. Phase B will add commerce mutation guards. Phase A does not
change PDP Add to Cart, Cart mutations/navigation, Checkout Place, reconciliation,
pricing, coupons, quantities, or Gift recipient city.

