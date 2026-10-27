import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const tick = () => new Promise((resolve) => setImmediate(resolve));
const read = (file) => readFileSync(path.join(root, file), "utf8");

// Execute the actual CheckoutPage render and its Place handler. Only hooks,
// child components and external side effects are substituted; no DOM or network.
function harness({ discovery, selected = "card", locale = "en", fulfillable = true, failure, resultKind = "verification-required", stored = true, navigationThrows = false, beforeReject, backendFixture, guest = false }) {
  const calls = [];
  const states = [];
  const refs = [];
  const mutation = { isError: false, error: null };
  const effects = { cleanup: 0, navigation: [], handoffs: [] };
  const verificationContexts = [];
  let cursor = 0;
  let refCursor = 0;
  const marker = () => null;
  const Button = () => null;
  const CheckoutSummary = () => null;
  const CheckoutShippingSection = () => null;
  const CheckoutPaymentRead = () => null;
  const CheckoutBuyerSection = () => null;
  const quote = { fulfillable, location: { inCoverage: true }, shippingOptions: [{ id: 1 }] };
  const queryClient = { cancelQueries: async () => {}, invalidateQueries: async () => {} };
  const stubs = {
    react: { ...React, useRef: (current) => {
      const index = refCursor++;
      return refs[index] ?? (refs[index] = { current });
    }, useState: (initial) => {
      const index = cursor++;
      if (!(index in states)) states[index] = initial === "card" ? selected : initial;
      return [states[index], (value) => { states[index] = value; }];
    } },
    "@tanstack/react-query": { useQueryClient: () => queryClient },
    "@/components/ui/button": { Button },
    "@/components/ui/error-state": { ErrorState: marker },
    "@/features/cart/api/cart-recommendation-lifecycle": { beginRecommendationTransition: () => ({ ready: Promise.resolve(), finish() {} }) },
    "@/features/cart/api/cart-query": { currentCartQueryKeyRoot: ["cart"], removeCurrentCartQueries() { effects.cleanup += 1; } },
    "@/features/checkout/api/checkout-query": { checkoutQuoteQueryKey: () => ["quote"] },
    "@/features/location/components/browsing-city-provider": { useBrowsingCity: () => ({ isChanging: false }) },
    "@/features/checkout/components/checkout-buyer-section": { CheckoutBuyerSection },
    "@/features/checkout/components/checkout-destination-section": { CheckoutDestinationSection: marker },
    "@/features/checkout/components/checkout-gift-wrap": { CheckoutGiftWrap: marker },
    "@/features/checkout/components/checkout-shipping-section": { CheckoutShippingSection },
    "@/features/checkout/components/checkout-summary": { CheckoutSummary },
    "@/features/checkout/components/checkout-payment-section": { CheckoutPaymentRead, CheckoutPaymentLoading: marker },
    "@/features/checkout/hooks/use-checkout-quote": { useCheckoutQuote: () => ({ data: quote, isSuccess: true, isFetching: false, isPending: false, refetch: async () => ({ data: quote }) }) },
    "@/features/checkout/hooks/use-checkout-place": { useCheckoutPlace: () => ({
      ...mutation, isPending: false, reset() { mutation.isError = false; mutation.error = null; }, mutateAsync: async (request) => {
        calls.push(request);
        if (failure) {
          let error;
          if (failure === "malformed") {
            try { load("src/features/checkout/api/parse-checkout-place-result").parseCheckoutPlaceResult({ kind: "confirmed" }); }
            catch (caught) { error = caught; }
          } else if (failure.code) {
            const { ApiError } = load("src/lib/api/api-error");
            error = new ApiError({ ...failure, message: "Synthetic private diagnostic" });
          } else {
            error = new Error("Synthetic private diagnostic");
          }
          mutation.isError = true;
          mutation.error = error;
          beforeReject?.();
          throw error;
        }
        if (backendFixture) {
          const parsed = load("src/features/checkout/api/parse-checkout-place-dto").parseCheckoutPlaceResponse(backendFixture);
          const mapped = load("src/features/checkout/api/checkout-place-mapper").mapCheckoutPlaceResult(parsed, undefined, request);
          return load("src/features/checkout/api/parse-checkout-place-result").parseCheckoutPlaceResult(JSON.parse(JSON.stringify(mapped)));
        }
        return { kind: resultKind, orderNumber: "synthetic-order" };
      },
    }) },
    "@/features/checkout/utils/checkout-handoff": {
      storeCheckoutPaymentHandoff() { effects.handoffs.push("hosted"); return stored; },
      storeCheckoutVerificationHandoff(result, phone) { effects.handoffs.push("otp"); verificationContexts.push({ result, phone }); return stored; },
      storeCheckoutConfirmationHandoff() { effects.handoffs.push("confirmation"); return stored; },
    },
    "@/i18n/navigation": { Link: marker, useRouter: () => ({ push(url) {
      if (navigationThrows) throw new Error("Synthetic navigation failure");
      effects.navigation.push(url);
    } }) },
  };
  const modules = new Map();
  function load(relative) {
    const base = path.join(root, relative);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find((file) => existsSync(file) && statSync(file).isFile());
    assert.ok(filename, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = { exports: {} }; modules.set(filename, loaded);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    vm.runInNewContext(code, {
      module: loaded, exports: loaded.exports, URL,
      window: { location: { assign() {
        if (navigationThrows) throw new Error("Synthetic navigation failure");
        effects.navigation.push("hosted");
      } } },
      require: (name) => stubs[name] ?? (name.startsWith("@/") ? load(`src/${name.slice(2)}`) : require(name)),
    }, { filename });
    return loaded.exports;
  }
  function find(element, type) {
    if (!element || typeof element !== "object") return undefined;
    if (element.type === type) return element;
    for (const child of React.Children.toArray(element.props?.children)) {
      const result = find(child, type); if (result) return result;
    }
  }
  const { CheckoutPage } = load("src/features/checkout/components/checkout-page");
  const copy = JSON.parse(read(`src/messages/${locale}/common.json`)).checkoutPage;
  const props = {
    addresses: [], addressesUnavailable: false, cartEmpty: false, copy, giftWrapConfig: null,
    initialGift: { isGift: false }, initialDestination: { kind: "saved-address", addressId: 1, cityId: 1 },
    isAuthenticated: !guest, locale, summaryItems: [], paymentDiscovery: discovery,
  };
  const render = () => { cursor = 0; refCursor = 0; return CheckoutPage(props); };
  let tree = render();
  if (guest) find(tree, CheckoutBuyerSection).props.onCommit({ kind: "guest", name: "Test", email: "test@example.invalid", phone: "0501234567" });
  find(tree, CheckoutShippingSection).props.onSelect(1);
  tree = render();
  const actions = find(tree, CheckoutSummary).props.placeAction;
  return {
    calls, effects, verificationContexts, button: find(actions, Button), actions, copy,
    snapshot: () => {
      const tree = render();
      const actions = find(tree, CheckoutSummary).props.placeAction;
      return { button: find(actions, Button), actions, shipping: find(tree, CheckoutShippingSection) };
    },
    payment: find(tree, CheckoutPaymentRead), render, find, CheckoutPaymentRead,
    refreshDiscovery: (discovery) => { props.paymentDiscovery = discovery; },
    serialize: load("src/features/checkout/api/checkout-place-serializer").serializeCheckoutPlaceRequest,
  };
}

const ready = (codes) => Promise.resolve({ kind: "ready", methods: codes.map((code) => ({ code, label: code, icon: "card" })) });

for (const locale of ["ar", "en"]) {
  for (const method of ["card", "apple_pay", "tap"]) {
    test(`${locale} Guest ${method}: real Place parser to browser action stores phone and navigates to OTP once`, async () => {
      const backendFixture = JSON.parse(read("tests/fixtures/checkout-guest-otp.json"));
      backendFixture.data.payment.method = method;
      const h = harness({ locale, guest: true, discovery: ready([method]), backendFixture });
      h.payment.props.onSelect(method);
      const button = h.snapshot().button;
      assert.equal(button.props.disabled, false);
      button.props.onClick(); button.props.onClick(); await tick();
      assert.equal(h.calls.length, 1);
      assert.equal(h.serialize(h.calls[0]).payment_method, method);
      assert.deepEqual(h.effects.navigation, ["/orders/RF-SYNTHETIC-GUEST/verify"]);
      assert.deepEqual(h.effects.handoffs, ["otp"]);
      assert.equal(h.verificationContexts[0].phone, "0501234567");
      h.snapshot().button.props.onClick(); await tick();
      assert.equal(h.calls.length, 1);
    });
  }
}

for (const method of ["card", "apple_pay", "tap"]) {
  test(`actual Checkout handler: ${method} hosted response keeps identity and cart, navigates once`, async () => {
    const backendFixture = JSON.parse(read("tests/fixtures/checkout-place-hosted.json"));
    backendFixture.data.payment.method = method;
    const h = harness({ discovery: ready([method]), backendFixture });
    h.payment.props.onSelect(method);
    const button = h.snapshot().button;
    assert.equal(button.props.disabled, false);
    button.props.onClick(); button.props.onClick(); await tick();
    assert.equal(h.calls.length, 1);
    assert.equal(h.serialize(h.calls[0]).payment_method, method);
    assert.deepEqual(h.effects.navigation, ["hosted"]);
    assert.deepEqual(h.effects.handoffs, ["hosted"]);
    assert.equal(h.effects.cleanup, 0);
    assert.ok(renderToStaticMarkup(h.snapshot().actions).includes(backendFixture.data.order_number));
    h.snapshot().button.props.onClick(); await tick();
    assert.equal(h.calls.length, 1);
  });
}

for (const options of [{ stored: false }, { navigationThrows: true }]) {
  test(`hosted Place storage/navigation failure keeps created identity and locks replay: ${JSON.stringify(options)}`, async () => {
    const backendFixture = JSON.parse(read("tests/fixtures/checkout-place-hosted.json"));
    const h = harness({ discovery: ready(["card"]), backendFixture, ...options });
    h.button.props.onClick(); await tick();
    assert.equal(h.snapshot().button.props.disabled, true);
    assert.ok(renderToStaticMarkup(h.snapshot().actions).includes(backendFixture.data.order_number));
    assert.equal(h.effects.cleanup, 0);
    h.snapshot().button.props.onClick(); h.button.props.onClick(); await tick();
    assert.equal(h.calls.length, 1);
  });
}

test("an additional selection is invalidated by a new discovery Promise; Card stays independent", () => {
  const h = harness({ discovery: ready(["card", "tap"]) });
  h.payment.props.onSelect("tap");
  assert.equal(h.snapshot().button.props.disabled, false);
  h.refreshDiscovery(ready(["card"]));
  assert.equal(h.snapshot().button.props.disabled, true);
  // An old streamed child's callback cannot authorize the refreshed selection.
  h.payment.props.onSelect("tap");
  assert.equal(h.snapshot().button.props.disabled, true);
  h.payment.props.onSelect("card");
  assert.equal(h.snapshot().button.props.disabled, false);
});

for (const locale of ["ar", "en"]) {
  test(`${locale}: runtime pending Card fixture navigates Guest to OTP once and preserves the submission lock`, async () => {
    const payload = JSON.parse(read("tests/fixtures/checkout-payment-otp-card.json"));
    const h = harness({ locale, discovery: ready(["card"]), backendFixture: payload, guest: true });
    assert.equal(h.button.props.disabled, false);
    h.button.props.onClick(); await tick();
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.effects.navigation, [`/orders/${payload.data.order_number}/verify`]);
    assert.deepEqual(h.effects.handoffs, ["otp"]);
    assert.equal(h.verificationContexts[0].result.orderNumber, payload.data.order_number);
    assert.equal(h.verificationContexts[0].phone, "0501234567");
    assert.equal(h.effects.cleanup, 1);
    assert.equal(h.snapshot().button.props.disabled, true);
    h.button.props.onClick(); h.snapshot().button.props.onClick(); await tick();
    assert.equal(h.calls.length, 1);
  });
}
const cases = [
  ["card discovered", () => ready(["card"])],
  ["Tap without card", () => ready(["tap"])],
  ["empty discovery", () => ready([])],
  ["failed discovery", () => Promise.resolve({ kind: "unavailable" })],
  ["unknown methods only", () => ready(["future"])],
  ["discovery still loading", () => new Promise(() => {})],
];

test("Promise refresh/remount preserve method policy; refresh cannot unlock a placed order", async () => {
  for (const selected of ["card", "tap", "apple_pay", "bank_transfer"]) {
    const h = harness({ discovery: ready(["card"]), selected });
    for (const discovery of [new Promise(() => {}), ready([]), Promise.resolve({ kind: "unavailable" }), ready(["card"])]) {
      h.refreshDiscovery(discovery);
      assert.equal(h.snapshot().button.props.disabled, selected !== "card");
      const remounted = harness({ discovery, selected });
      assert.equal(remounted.button.props.disabled, selected !== "card");
    }
    h.snapshot().button.props.onClick(); await tick();
    assert.equal(h.calls.length, selected === "card" ? 1 : 0);
    h.refreshDiscovery(ready(["card"]));
    h.snapshot().button.props.onClick(); await tick();
    assert.equal(h.calls.length, selected === "card" ? 1 : 0);
  }
});

for (const [name, discovery] of cases) {
  test(`presentation-only discovery: ${name} preserves the declared Card submission`, async () => {
    const h = harness({ discovery: discovery() });
    assert.equal(h.button.props.disabled, false);
    assert.equal(h.button.props["aria-describedby"], "checkout-submitted-payment");
    assert.ok(renderToStaticMarkup(h.actions).includes(h.copy.payment.submissionNotice.replace("{method}", h.copy.payment.methods.card.label)));
    h.button.props.onClick();
    await tick();
    assert.equal(h.calls.length, 1);
    assert.equal(h.serialize(h.calls[0]).payment_method, "card");
    assert.equal(h.calls[0].paymentMethod, "card");
  });

  test(`actual Place guard: mismatched Tap selection cannot submit with ${name}`, async () => {
    const h = harness({ discovery: discovery(), selected: "tap" });
    assert.equal(h.button.props.disabled, true);
    // Deliberately invoke the disabled button's handler to exercise the guard.
    h.button.props.onClick();
    await tick();
    assert.equal(h.calls.length, 0);
  });
}

for (const locale of ["ar", "en"]) {
  test(`${locale} identifies the submitted method even on discovery failure and explains a blocked selection`, async () => {
    const h = harness({ locale, discovery: Promise.resolve({ kind: "unavailable" }), selected: "apple_pay" });
    const html = renderToStaticMarkup(h.actions);
    assert.ok(html.includes(h.copy.payment.submissionNotice.replace("{method}", h.copy.payment.methods.apple_pay.label)));
    assert.ok(html.includes(h.copy.payment.selectionUnavailable));
    assert.match(html, /role="alert"/);
    h.button.props.onClick(); await tick();
    assert.equal(h.calls.length, 0);
  });
}

test("Guest selection can choose an advertised Tap method", () => {
  const h = harness({ discovery: ready(["card", "tap"]), guest: true });
  h.payment.props.onSelect("tap");
  assert.equal(h.find(h.render(), h.CheckoutPaymentRead).props.selectedCode, "tap");
});

for (const selected of ["bank_transfer", "future", null]) {
  test(`actual Place guard rejects unsupported or missing selection: ${selected}`, async () => {
    const h = harness({ discovery: ready(["card"]), selected });
    assert.equal(h.button.props.disabled, true);
    h.button.props.onClick(); await tick();
    assert.equal(h.calls.length, 0);
  });
}

test("payment compatibility does not bypass the existing fulfillment guard", async () => {
  const h = harness({ discovery: ready(["card"]), fulfillable: false });
  assert.equal(h.button.props.disabled, true);
  h.button.props.onClick(); await tick();
  assert.equal(h.calls.length, 0);
});

for (const failure of [true, { status: 503, code: "service-unavailable" }, { status: 409, code: "unavailable-lines" }, { status: 401, code: "unauthorized" }]) {
  test(`uncertain outcome locks the actual Place handler across rerenders and edits: ${JSON.stringify(failure)}`, async () => {
    const h = harness({ discovery: ready(["card"]), failure });
    h.button.props.onClick();
    h.button.props.onClick();
    await tick();
    assert.equal(h.calls.length, 1);
    assert.equal(h.effects.cleanup, 0);
    assert.equal(h.effects.navigation.length, 0);
    const next = h.snapshot();
    assert.equal(next.button.props.disabled, true);
    assert.ok(renderToStaticMarkup(next.actions).includes(h.copy.place.outcomeUnknown));
    next.shipping.props.onSelect(1); // Existing mutation.reset must not clear the lock.
    h.snapshot().button.props.onClick();
    h.button.props.onClick(); // A stale closure must also remain blocked.
    await tick();
    assert.equal(h.calls.length, 1);
  });
}

test("proven local pre-Place rejection permits a deliberate corrected attempt, never an automatic retry", async () => {
  const h = harness({ discovery: ready(["card"]), failure: { status: 409, code: "identity-mismatch" } });
  h.button.props.onClick(); await tick();
  assert.equal(h.calls.length, 1);
  assert.equal(h.snapshot().button.props.disabled, false);
  h.snapshot().button.props.onClick(); await tick();
  assert.equal(h.calls.length, 2);
  assert.equal(h.effects.cleanup, 0);
});

for (const resultKind of ["verification-required", "confirmed"]) {
  test(`${resultKind} preserves existing cleanup/navigation and cannot submit again`, async () => {
    const h = harness({ discovery: ready(["card"]), resultKind });
    h.button.props.onClick(); await tick();
    assert.equal(h.effects.cleanup, 1);
    assert.equal(h.effects.handoffs.join(), resultKind === "confirmed" ? "confirmation" : "otp");
    assert.equal(h.effects.navigation[0], `/orders/synthetic-order/${resultKind === "confirmed" ? "confirmation" : "verify"}`);
    h.snapshot().button.props.onClick(); h.button.props.onClick(); await tick();
    assert.equal(h.calls.length, 1);
  });
}

for (const options of [{ stored: false }, { navigationThrows: true }]) {
  test(`accepted order remains locked when handoff/navigation fails: ${JSON.stringify(options)}`, async () => {
    const h = harness({ discovery: ready(["card"]), resultKind: "confirmed", ...options });
    h.button.props.onClick(); await tick();
    const next = h.snapshot();
    assert.equal(next.button.props.disabled, true);
    const html = renderToStaticMarkup(next.actions);
    assert.ok(html.includes(h.copy.place.orderCreated));
    assert.ok(html.includes("synthetic-order"));
    assert.equal(h.effects.navigation.length, 0);
    next.button.props.onClick(); await tick();
    assert.equal(h.calls.length, 1);
  });
}

test("an unexpected pending browser branch cannot clean up, persist a handoff or navigate", async () => {
  const h = harness({ discovery: ready(["card"]), resultKind: "hosted-payment-pending" });
  h.button.props.onClick(); await tick();
  assert.equal(h.effects.cleanup, 0);
  assert.equal(h.effects.handoffs.length, 0);
  assert.equal(h.effects.navigation.length, 0);
  h.snapshot().button.props.onClick(); await tick();
  assert.equal(h.calls.length, 1);
});

for (const locale of ["ar", "en"]) {
  for (const failure of [true, "malformed", { status: 409, code: "checkout-changed" }, { status: 409, code: "unavailable-lines" }]) {
    test(`${locale}: uncertain ${JSON.stringify(failure)} never renders retry guidance, including before the handler catch`, async () => {
      let intermediate;
      const h = harness({ locale, discovery: ready(["card"]), failure, beforeReject() {
        intermediate = h.snapshot();
      } });
      h.button.props.onClick(); await tick();
      for (const snapshot of [intermediate, h.snapshot()]) {
        assert.ok(snapshot);
        const html = renderToStaticMarkup(snapshot.actions);
        assert.ok(html.includes(h.copy.place.outcomeUnknown));
        assert.ok(!html.includes(h.copy.place.error));
        assert.ok(!html.includes(h.copy.place.checkoutChanged));
        assert.ok(!html.includes("Synthetic private diagnostic"));
        assert.equal(snapshot.button.props.disabled, true);
        snapshot.button.props.onClick();
      }
      await tick();
      assert.equal(h.calls.length, 1);
    });
  }

  for (const code of ["invalid-input", "invalid-locale", "cart-session-unavailable", "identity-mismatch"]) {
    test(`${locale}: definitive ${code} renders retry feedback and permits only deliberate resubmission`, async () => {
      const h = harness({ locale, discovery: ready(["card"]), failure: { status: code.startsWith("invalid-") ? 400 : 409, code } });
      h.button.props.onClick(); await tick();
      const next = h.snapshot();
      const html = renderToStaticMarkup(next.actions);
      assert.ok(html.includes(h.copy.place.error));
      assert.ok(!html.includes(h.copy.place.outcomeUnknown));
      assert.ok(!html.includes("Synthetic private diagnostic"));
      assert.equal(next.button.props.disabled, false);
      assert.equal(h.calls.length, 1);
      next.button.props.onClick(); await tick();
      assert.equal(h.calls.length, 2);
    });
  }

  for (const resultKind of ["confirmed", "verification-required"]) {
    for (const options of [{ stored: false }, { navigationThrows: true }]) {
      test(`${locale}: ${resultKind} ${JSON.stringify(options)} keeps the order reference and blocks retry`, async () => {
        const h = harness({ locale, discovery: ready(["card"]), resultKind, ...options });
        h.button.props.onClick(); await tick();
        const next = h.snapshot();
        const html = renderToStaticMarkup(next.actions);
        assert.ok(html.includes(h.copy.place.orderCreated));
        assert.ok(html.includes("<bdi>synthetic-order</bdi>"));
        assert.match(html, /role="status"/);
        assert.ok(!html.includes(h.copy.place.error));
        assert.ok(!html.includes(h.copy.place.outcomeUnknown));
        assert.equal(next.button.props.disabled, true);
        next.button.props.onClick(); h.button.props.onClick(); await tick();
        assert.equal(h.calls.length, 1);
        assert.equal(h.effects.navigation.length, 0);
      });
    }
  }

  test(`${locale}: unexpected pending result shows uncertainty without promising payment recovery`, async () => {
    const h = harness({ locale, discovery: ready(["card"]), resultKind: "hosted-payment-pending" });
    h.button.props.onClick(); await tick();
    const next = h.snapshot();
    assert.ok(renderToStaticMarkup(next.actions).includes(h.copy.place.outcomeUnknown));
    assert.equal(next.button.props.disabled, true);
    next.button.props.onClick(); await tick();
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.effects, { cleanup: 0, navigation: [], handoffs: [] });
  });
}
