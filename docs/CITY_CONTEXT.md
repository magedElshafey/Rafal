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
  performs no target refresh, and exposes localized recoverable feedback.
- Once persistence succeeds, the new cookie-backed city remains committed. A later
  region/query failure does not automatically write the former city back; the
  affected region owns its error and retry experience.

Persistence is never silently retried.

## Commerce guards and Cart synchronization

`BrowsingCityProvider` is the only client transition signal. PDP Add to Cart,
Cart writes, Cart-to-Checkout navigation, and Checkout Place prevent new operations
from starting during `persisting` or `syncing`. The storefront veil remains visual
and non-blocking; protection is owned by each commerce handler and its controls.

The ordinary Cart projects against the coordinator's committed Browsing City. It
therefore remains on A during `persisting`, switches to the B projection after the
cookie write commits B, and cannot use an A projection to enable Checkout for B.
Persisted Gift recipient city still takes precedence for Gift Cart fulfillment.
Cart continues to own canonical Cart identity, projection readiness, unavailable-line
display, and its authoritative pre-navigation flush/refetch checks. Global RSC
synchronization never waits for Cart projection readiness.

Checkout Place also rejects a new start during the Browsing City transition, while
its quote and request remain keyed exclusively by the explicit fulfillment
destination. Browsing City changes do not rewrite saved, one-time, or Gift recipient
destinations and do not invalidate destination-keyed quotes by themselves.

Guards prevent new stale-context writes; operations already in flight are not
cancelled and may settle normally. The authoritative Cart projection reconciles Cart
results afterward. An already-started Place request may settle because its fulfillment
destination is explicit and independent from Browsing City.

The former `rafal:browsing-city-selected` window event had no consumer outside Cart.
It has been removed along with Cart's local transition-city mirror, avoiding a second
permanent transition source.

## Scope boundary

There is no universal client city store, Redux/Zustand state, localStorage city, or
global commerce store. There is no global page lock, automatic Cart
clearing/removal/repricing, or invented backend reconciliation behavior. Quick Add
and unrelated commerce redesign remain outside this scope.

