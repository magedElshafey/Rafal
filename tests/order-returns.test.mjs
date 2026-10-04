import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

function sourceLoader(overrides = {}, globals = {}) {
  const modules = new Map();
  function load(relativePath) {
    const base = path.join(root, relativePath);
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    assert.ok(filename, `Resolve ${relativePath}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    const loaded = { exports: {} };
    modules.set(filename, loaded);
    vm.runInNewContext(outputText, {
      AbortController,
      AbortSignal,
      console,
      Date,
      DOMException,
      FormData,
      Headers,
      Intl,
      module: loaded,
      exports: loaded.exports,
      process,
      Request,
      Response,
      URL,
      URLSearchParams,
      fetch: (...args) => globalThis.fetch(...args),
      ...globals,
      require: (specifier) => {
        if (specifier in overrides) return overrides[specifier];
        if (specifier === "server-only") return {};
        if (specifier.startsWith("@/")) return load(`src/${specifier.slice(2)}`);
        if (specifier.startsWith(".")) {
          return load(
            path
              .relative(root, path.resolve(path.dirname(filename), specifier))
              .replaceAll("\\", "/"),
          );
        }
        return require(specifier);
      },
    }, { filename });
    return loaded.exports;
  }
  return load;
}

function response(status = "pending", reason = "damaged") {
  return {
    success: true,
    message: "Return request retrieved successfully",
    data: {
      id: 31,
      order_id: 47,
      order_number: "RF-10047",
      status,
      reason,
      comment: "no comment",
      decision_note: null,
      decided_by_admin_id: null,
      decided_at: null,
      created_at: "2026-09-26T17:49:57+00:00",
      updated_at: "2026-09-26T17:49:57+00:00",
    },
  };
}

const load = sourceLoader();
const {
  isOrderReturnReason,
  isOrderReturnStatus,
  OrderReturnContractError,
  parseOrderReturnResponse,
} = load("src/features/order-returns/api/parse-order-return-dto");
const { mapOrderReturnResponse } = load(
  "src/features/order-returns/api/order-return-mapper",
);
const { orderReturnReasons, orderReturnStatuses } = load(
  "src/features/order-returns/types/order-return.types",
);
const { parseOrderReturnSubmissionInput } = load(
  "src/features/order-returns/utils/order-return-contract",
);
const { canCreateOrderReturn, hasInconsistentReturnCapability } = load(
  "src/features/order-returns/utils/order-return-eligibility",
);
const { OrderReturnSummaryCard } = load(
  "src/features/order-returns/components/order-return-summary-card",
);

const copy = {
  action: "Request return",
  title: "Request a return",
  orderContextText: "Order #RF-10047.",
  description: "Select a return reason. Your request will be sent for review.",
  reasonLabel: "Return reason",
  reasonPlaceholder: "Select a reason",
  reasonRequired: "Select a return reason.",
  reasons: {
    damaged: "Damaged product",
    wrong_item: "Wrong item received",
    not_as_described: "Not as described",
    changed_mind: "Changed my mind",
    other: "Other",
  },
  submit: "Submit return request",
  submitting: "Submitting return request",
  cancel: "Cancel",
  close: "Close",
  successTitle: "Return request submitted",
  successBody: "Your return request has been received and will be reviewed.",
  summaryTitle: "Return request",
  requestDate: "Request date",
  decisionDate: "Decision date",
  decisionNote: "Decision note",
  statuses: { pending: "Under review", approved: "Approved", rejected: "Rejected" },
  errors: {
    auth: "Auth",
    invalidReason: "Invalid reason",
    notAllowed: "Not allowed",
    rateLimited: "Rate limited",
    service: "Service failure",
  },
};

function domain(status = "pending", reason = "damaged") {
  return mapOrderReturnResponse(parseOrderReturnResponse(response(status, reason)));
}

function order(customerStatus, canRequestReturn) {
  return {
    orderNumber: "RF-10047",
    customerStatus,
    placedAt: "2026-09-26T17:49:57+00:00",
    status: "delivered",
    capabilities: { canCancel: false, canReorder: false, canRequestReturn },
  };
}

test("reason and status contracts accept only the exact documented enums", () => {
  assert.deepEqual(Array.from(orderReturnReasons), [
    "damaged", "wrong_item", "not_as_described", "changed_mind", "other",
  ]);
  assert.deepEqual(Array.from(orderReturnStatuses), ["pending", "approved", "rejected"]);
  for (const reason of orderReturnReasons) assert.equal(isOrderReturnReason(reason), true);
  for (const status of orderReturnStatuses) assert.equal(isOrderReturnStatus(status), true);
  assert.equal(isOrderReturnReason("refund"), false);
  assert.equal(isOrderReturnStatus("refunded"), false);
});

test("submission input permits one raw reason field and rejects arbitrary or extra data", () => {
  for (const reason of orderReturnReasons) {
    assert.equal(parseOrderReturnSubmissionInput({ reason }).reason, reason);
  }
  assert.equal(parseOrderReturnSubmissionInput({ reason: "refund" }), null);
  assert.equal(parseOrderReturnSubmissionInput({ reason: "other", comment: "text" }), null);
  assert.equal(parseOrderReturnSubmissionInput({}), null);
});

test("strict response parser accepts all statuses and required nullable fields", () => {
  for (const status of orderReturnStatuses) {
    assert.equal(parseOrderReturnResponse(response(status)).data.status, status);
  }
  const parsed = parseOrderReturnResponse(response());
  assert.equal(parsed.data.decision_note, null);
  assert.equal(parsed.data.decided_at, null);
  assert.equal(parsed.data.decided_by_admin_id, null);
});

test("strict response parser rejects malformed identity, enums, timestamps and envelope", () => {
  for (const [field, value] of [
    ["id", 0], ["id", 1.5], ["order_id", -1], ["order_number", ""],
    ["reason", "refund"], ["status", "completed"],
    ["created_at", "2026-02-30T12:00:00Z"], ["updated_at", "bad"],
    ["decided_by_admin_id", 0], ["decided_at", "yesterday"],
  ]) {
    const input = response(); input.data[field] = value;
    assert.throws(() => parseOrderReturnResponse(input), OrderReturnContractError);
  }
  const unsuccessful = response(); unsuccessful.success = false;
  assert.throws(() => parseOrderReturnResponse(unsuccessful), OrderReturnContractError);
});

test("mapper normalizes IDs and omits internal Admin identity", () => {
  const request = domain();
  assert.equal(request.id, "31");
  assert.equal(request.orderId, "47");
  assert.equal(request.comment, "no comment");
  assert.equal("decidedByAdminId" in request, false);
});

test("creation eligibility requires completed plus backend capability and no date math", () => {
  assert.equal(canCreateOrderReturn(order("completed", true)), true);
  assert.equal(canCreateOrderReturn(order("completed", false)), false);
  assert.equal(canCreateOrderReturn(order("processing", true)), false);
  assert.equal(canCreateOrderReturn(order("cancelled", true)), false);
  assert.equal(hasInconsistentReturnCapability(order("processing", true)), true);
  const source = readFileSync(
    path.join(root, "src/features/order-returns/utils/order-return-eligibility.ts"),
    "utf8",
  );
  assert.doesNotMatch(source, /Date|placedAt|delivered|payment|timeline/);
});

test("only completed ineligible orders read history; unknown GET remains unavailable", async () => {
  let reads = 0;
  const logs = [];
  const boundaryLoad = sourceLoader({
    console: { error: (...args) => logs.push(args) },
    "@/features/auth/server/auth-session": { getAccessToken: async () => "secret" },
    "@/features/order-returns/api/order-returns-api.server": {
      createOrderReturnDto: async () => parseOrderReturnResponse(response()),
      getOrderReturnDto: async () => {
        reads += 1;
        return parseOrderReturnResponse(response());
      },
    },
  });
  const { resolveOrderReturnModuleState } = boundaryLoad(
    "src/features/order-returns/server/order-returns-boundary",
  );
  assert.equal((await resolveOrderReturnModuleState("en", order("completed", true))).kind, "create");
  assert.equal(reads, 0);
  assert.equal((await resolveOrderReturnModuleState("en", order("completed", false))).kind, "existing");
  assert.equal(reads, 1);
  assert.equal((await resolveOrderReturnModuleState("en", order("processing", false))).kind, "unavailable");
  assert.equal((await resolveOrderReturnModuleState("en", order("cancelled", false))).kind, "unavailable");
  assert.equal((await resolveOrderReturnModuleState("en", order("processing", true))).kind, "unavailable");
  assert.equal(reads, 1);

  const failingLoad = sourceLoader({
    console: { error: (...args) => logs.push(args) },
    "@/features/auth/server/auth-session": { getAccessToken: async () => "secret" },
    "@/features/order-returns/api/order-returns-api.server": {
      getOrderReturnDto: async () => { throw new Error("private payload"); },
    },
  });
  const failingBoundary = failingLoad(
    "src/features/order-returns/server/order-returns-boundary",
  );
  const result = await failingBoundary.resolveOrderReturnModuleState(
    "en",
    order("completed", false),
  );
  assert.equal(result.kind, "unavailable");
  assert.doesNotMatch(JSON.stringify(logs), /private payload|secret/);
});

test("GET and POST identity mismatch fail closed; creation requires pending", async () => {
  for (const scenario of ["identity", "status"]) {
    const boundaryLoad = sourceLoader({
      "@/features/auth/server/auth-session": { getAccessToken: async () => "secret" },
      "@/features/order-returns/api/order-returns-api.server": {
        createOrderReturnDto: async () => {
          const input = response(scenario === "status" ? "approved" : "pending");
          if (scenario === "identity") input.data.order_number = "RF-OTHER";
          return parseOrderReturnResponse(input);
        },
      },
    });
    const boundary = boundaryLoad("src/features/order-returns/server/order-returns-boundary");
    await assert.rejects(
      boundary.createCurrentUserOrderReturn("en", "RF-10047", "damaged"),
      scenario === "identity"
        ? boundary.OrderReturnIdentityMismatchError
        : boundary.OrderReturnUnexpectedStatusError,
    );
  }
});

test("Laravel adapter sends one non-retried authenticated JSON reason-only POST", async () => {
  let config;
  const apiLoad = sourceLoader({
    "@/lib/api/server-api": {
      serverApi: {
        request: async (requestConfig) => {
          config = requestConfig;
          return response();
        },
      },
    },
  });
  const { createOrderReturnDto } = apiLoad(
    "src/features/order-returns/api/order-returns-api.server",
  );
  await createOrderReturnDto("ar", "server-secret", "RF/100", "other");
  assert.equal(config.path, "/orders/RF%2F100/return-request");
  assert.equal(config.method, "POST");
  assert.deepEqual({ ...config.body }, { reason: "other" });
  assert.equal(Object.keys(config.body).length, 1);
  assert.equal(config.retry, false);
  assert.equal(config.headers.Authorization, "Bearer server-secret");
  assert.equal(config.headers["Accept-Language"], "ar");
  assert.equal(config.headers["X-Cart-Token"], undefined);
});

test("BFF rejects unauthenticated/invalid input and forwards one valid raw reason", async () => {
  let calls = 0;
  let forwarded;
  class AuthError extends Error {}
  const routeLoad = sourceLoader({
    "next-intl": { hasLocale: (locales, locale) => locales.includes(locale) },
    "@/i18n/routing": { routing: { locales: ["ar", "en"] } },
    "@/features/auth/server/auth-session": { clearAccessToken: async () => {} },
    "@/features/order-returns/server/order-returns-boundary": {
      OrderReturnAuthenticationError: AuthError,
      OrderReturnIdentityMismatchError: class extends Error {},
      OrderReturnUnexpectedStatusError: class extends Error {},
      createCurrentUserOrderReturn: async (...args) => {
        calls += 1; forwarded = args; return domain();
      },
    },
  });
  const { POST } = routeLoad("src/app/api/orders/[orderNumber]/return-request/route");
  const context = { params: Promise.resolve({ orderNumber: "RF-10047" }) };
  for (const [url, body] of [
    ["https://store.test/api/orders/RF-10047/return-request?locale=xx", { reason: "damaged" }],
    ["https://store.test/api/orders/RF-10047/return-request?locale=en", { reason: "refund" }],
    ["https://store.test/api/orders/RF-10047/return-request?locale=en", { reason: "other", comment: "no" }],
  ]) {
    const result = await POST(new Request(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }), context);
    assert.equal(result.status, 400);
  }
  assert.equal(calls, 0);
  const valid = await POST(new Request(
    "https://store.test/api/orders/RF-10047/return-request?locale=ar",
    { method: "POST", headers: { "Content-Type": "application/json", Authorization: "browser", "X-Cart-Token": "cart" }, body: JSON.stringify({ reason: "wrong_item" }) },
  ), context);
  assert.equal(valid.status, 200);
  assert.equal(valid.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(forwarded.slice(0, 3), ["ar", "RF-10047", "wrong_item"]);
  assert.equal(calls, 1);
});

test("browser submits exact reason-only body with no auth or Cart identity and no retry", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return Response.json({ code: "not-allowed" }, { status: 409 });
  };
  try {
    const browserLoad = sourceLoader();
    const { createOrderReturnFromBrowser } = browserLoad(
      "src/features/order-returns/api/create-order-return",
    );
    await assert.rejects(createOrderReturnFromBrowser("en", "RF/100", "other"));
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/api/orders/RF%2F100/return-request?locale=en");
  assert.deepEqual(JSON.parse(calls[0][1].body), { reason: "other" });
  assert.equal(calls[0][1].headers.Authorization, undefined);
  assert.equal(calls[0][1].headers["X-Cart-Token"], undefined);
  assert.equal(calls[0][1].credentials, "same-origin");
});

test("summary card localizes status/reason, dates and semantic colors without private fields", () => {
  for (const [status, label, style] of [
    ["pending", "Under review", "bg-gold-50"],
    ["approved", "Approved", "bg-success/10"],
    ["rejected", "Rejected", "bg-destructive/10"],
  ]) {
    const request = domain(status, "wrong_item");
    const html = renderToStaticMarkup(React.createElement(OrderReturnSummaryCard, {
      copy, locale: "en", request,
    }));
    assert.match(html, new RegExp(label));
    assert.match(html, new RegExp(style.replace("/", "\\/")));
    assert.match(html, /Wrong item received/);
    assert.doesNotMatch(html, />wrong_item</);
    assert.match(html, /<time dateTime="2026-09-26T17:49:57\+00:00"/);
    assert.doesNotMatch(html, /no comment|decidedByAdmin|31/);
  }
});

test("decision note/date are optional and non-null note is escaped plain text", () => {
  const emptyHtml = renderToStaticMarkup(React.createElement(OrderReturnSummaryCard, {
    copy, locale: "en", request: domain("approved"),
  }));
  assert.doesNotMatch(emptyHtml, /Decision note|Decision date/);

  const input = response("rejected");
  input.data.decision_note = "<script>private</script>";
  input.data.decided_at = "2026-09-28T10:00:00+03:00";
  input.data.decided_by_admin_id = 99;
  const html = renderToStaticMarkup(React.createElement(OrderReturnSummaryCard, {
    copy, locale: "en", request: mapOrderReturnResponse(parseOrderReturnResponse(input)),
  }));
  assert.match(html, /Decision note/);
  assert.match(html, /&lt;script&gt;private&lt;\/script&gt;/);
  assert.match(html, /Decision date/);
  assert.doesNotMatch(html, /<script|99/);
});

test("Arabic and English contain every customer reason/status label", () => {
  const en = JSON.parse(readFileSync(path.join(root, "src/messages/en/account.json"), "utf8"));
  const ar = JSON.parse(readFileSync(path.join(root, "src/messages/ar/account.json"), "utf8"));
  for (const messages of [en, ar]) {
    const returns = messages.orders.details.returnRequest;
    assert.deepEqual(Object.keys(returns.reasons).sort(), [
      "changedMind", "damaged", "notAsDescribed", "other", "wrongItem",
    ]);
    assert.deepEqual(Object.keys(returns.statuses).sort(), ["approved", "pending", "rejected"]);
  }
  assert.equal(ar.orders.details.returnRequest.statuses.pending, "قيد المراجعة");
  assert.equal(en.orders.details.returnRequest.reasons.damaged, "Damaged product");
});

test("form has no preselected reason, exactly five options, no comment, and synchronous guard", () => {
  const source = readFileSync(
    path.join(root, "src/features/order-returns/components/order-return-action.tsx"),
    "utf8",
  );
  assert.match(source, /useState<OrderReturnReason \| "">\(""\)/);
  assert.match(source, /<option value="" disabled>/);
  assert.match(source, /orderReturnReasons\.map/);
  assert.doesNotMatch(source, /textarea|comment/i);
  assert.match(source, /invalid=\{Boolean\(reasonError\)\}/);
  assert.match(source, /disabled=\{pending\}/);
  assert.match(source, /setReason\(""\);[\s\S]*setReasonError\(null\);[\s\S]*setFormError\(null\);/);
  assert.match(source, /role="alert"[\s\S]*\{formError\}/);
  assert.match(source, /type="button"[\s\S]*\{copy\.cancel\}/);
  assert.match(source, /type="button"[\s\S]*\{copy\.close\}/);
  const guard = source.indexOf("if (submissionPendingRef.current) return;");
  const lock = source.indexOf("submissionPendingRef.current = true;", guard);
  const request = source.indexOf("await createOrderReturnFromBrowser", lock);
  assert.ok(guard >= 0 && lock > guard && request > lock);
  const catchBlock = source.slice(source.indexOf("} catch (submissionError)"), source.indexOf("} finally"));
  assert.doesNotMatch(catchBlock, /setReason\(/);
  assert.match(catchBlock, /setReasonError\(copy\.errors\.invalidReason\)/);
  assert.match(catchBlock, /setFormError\(copy\.errors\[key\]\)/);
});

test("OrderReturnAction renders a serializable string context in its modal description", () => {
  function Button({ children, loading, loadingLabel, ...props }) {
    void loading;
    void loadingLabel;
    return React.createElement("button", props, children);
  }
  function Field({ children }) {
    return React.createElement("div", null, children);
  }
  function FieldLabel({ children, ...props }) {
    return React.createElement("label", props, children);
  }
  function FieldError({ children, ...props }) {
    return React.createElement("p", props, children);
  }
  function NativeSelect({ children, invalid, ...props }) {
    return React.createElement("select", { ...props, "data-invalid": invalid }, children);
  }
  function RafalModal({ children, description, footer, title }) {
    return React.createElement(
      "section",
      null,
      React.createElement("h2", null, title),
      React.createElement("p", null, description),
      children,
      footer,
    );
  }
  const actionLoad = sourceLoader({
    "@/components/ui/button": { Button },
    "@/components/ui/field": { Field, FieldError, FieldLabel },
    "@/components/ui/native-select": { NativeSelect },
    "@/components/ui/rafal-modal": { RafalModal },
    "@/features/order-returns/components/order-return-summary-card": {
      OrderReturnSummaryCard: () => React.createElement("div", null, "summary"),
    },
    "@/i18n/navigation": { useRouter: () => ({ refresh() {} }) },
  });
  const { OrderReturnAction } = actionLoad(
    "src/features/order-returns/components/order-return-action",
  );
  let html;
  assert.doesNotThrow(() => {
    html = renderToStaticMarkup(
      React.createElement(OrderReturnAction, {
        copy,
        locale: "en",
        orderNumber: "RF-10047",
      }),
    );
  });
  assert.match(
    html,
    /Order #RF-10047\. Select a return reason\. Your request will be sent for review\./,
  );
  const source = readFileSync(
    path.join(root, "src/features/order-returns/components/order-return-action.tsx"),
    "utf8",
  );
  assert.doesNotMatch(source, /orderContextText\s*\(/);
});

test("Order Details renders creation only for the two-signal eligible state", () => {
  const element = (name) => {
    function StubComponent() {
      return React.createElement("div", null, name);
    }
    return StubComponent;
  };
  function StubOrderDetailsHeader({ actions }) {
    return React.createElement("header", null, actions);
  }
  function StubLink({ children, ...props }) {
    return React.createElement("a", props, children);
  }
  const viewLoad = sourceLoader({
    "@/components/ui/icons": { ChevronLeftIcon: element("back") },
    "@/features/order-returns/components/order-return-action": {
      OrderReturnAction: element("return-action"),
    },
    "@/features/orders/components/cancel-order-action": {
      CancelOrderAction: element("cancel-action"),
    },
    "@/features/orders/components/order-details-content": {
      OrderDetailsHeader: StubOrderDetailsHeader,
      OrderDetailsContent: element("details"),
    },
    "@/i18n/navigation": {
      Link: StubLink,
    },
  });
  const { OrderDetailsView } = viewLoad(
    "src/features/orders/components/order-details-view",
  );
  const render = (customerStatus, capability) =>
    renderToStaticMarkup(React.createElement(OrderDetailsView, {
      copy: { backToOrders: "Back", cancel: {}, productReview: {}, returnRequest: copy },
      locale: "en",
      order: order(customerStatus, capability),
      returnHistory: React.createElement("div", null, "return-summary"),
    }));

  assert.match(render("completed", true), /return-action/);
  assert.doesNotMatch(render("completed", false), /return-action/);
  assert.doesNotMatch(render("processing", true), /return-action/);
  assert.doesNotMatch(render("cancelled", true), /return-action/);
  assert.doesNotMatch(render("processing", false), /return-summary/);
  assert.doesNotMatch(render("cancelled", false), /return-summary/);
  assert.doesNotMatch(render("processing", true), /return-summary/);
  const existing = render("completed", false);
  assert.match(existing, /return-summary/);
  assert.doesNotMatch(existing, /return-action/);
});

test("Order Details stays server-first, action is order-level, and Guest stays read-only", () => {
  const page = readFileSync(
    path.join(root, "src/app/[locale]/(storefront)/account/orders/[orderNumber]/page.tsx"),
    "utf8",
  );
  const view = readFileSync(
    path.join(root, "src/features/orders/components/order-details-view.tsx"),
    "utf8",
  );
  const items = readFileSync(
    path.join(root, "src/features/orders/components/order-items.tsx"),
    "utf8",
  );
  const guest = readFileSync(
    path.join(root, "src/features/orders/components/guest-order-result.tsx"),
    "utf8",
  );
  assert.doesNotMatch(page, /["']use client["']|useEffect/);
  assert.doesNotMatch(view, /["']use client["']|useEffect/);
  assert.match(view, /<OrderReturnAction[\s\S]*<OrderDetailsContent/);
  assert.doesNotMatch(items, /OrderReturn|Request return|canRequestReturn/);
  assert.doesNotMatch(guest, /OrderReturn|Request return|canRequestReturn/);
  const route = readFileSync(
    path.join(root, "src/app/api/orders/[orderNumber]/return-request/route.ts"),
    "utf8",
  );
  assert.doesNotMatch(route, /X-Cart-Token|cart token/i);
});

test("Return copy crosses the Server to Client boundary as preformatted text only", () => {
  const types = readFileSync(
    path.join(root, "src/features/order-returns/types/order-return.types.ts"),
    "utf8",
  );
  const page = readFileSync(
    path.join(root, "src/app/[locale]/(storefront)/account/orders/[orderNumber]/page.tsx"),
    "utf8",
  );
  const action = readFileSync(
    path.join(root, "src/features/order-returns/components/order-return-action.tsx"),
    "utf8",
  );
  assert.match(types, /orderContextText: string/);
  assert.doesNotMatch(types, /orderContext:/);
  assert.match(page, /orderContextText: t\("returnRequest\.orderContext", \{/);
  assert.match(action, /`\$\{copy\.orderContextText\} \$\{copy\.description\}`/);
  assert.doesNotMatch(`${types}\n${page}\n${action}`, /orderContextText\s*\(/);
});

test("feature adds no client cache/global state and success copy invents no refund lifecycle", () => {
  const files = [
    "src/features/order-returns/components/order-return-action.tsx",
    "src/features/order-returns/components/order-return-summary-card.tsx",
    "src/features/order-returns/server/order-returns-boundary.ts",
  ].map((file) => readFileSync(path.join(root, file), "utf8")).join("\n");
  assert.doesNotMatch(files, /react-query|useQuery|localStorage|sessionStorage/);
  assert.doesNotMatch(JSON.stringify(copy), /refund|pickup|replacement/i);
});
