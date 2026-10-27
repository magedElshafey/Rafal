import { test, expect, type Page } from "@playwright/test";

const phone = "+966501234567";
const result = (page: Page) => page.locator("[data-payment-result]");
const url = (locale: string, order = "RF-10103", status = "success") =>
  `/${locale}/checkout/payment-result?${new URLSearchParams({ status, order_number: order })}`;
async function setup(page: Page, options: { authenticated?: boolean; order?: string; mismatch?: boolean; blockedStorage?: boolean } = {}) {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  // Checkout already has a selected delivery city. Preserve that shell context.
  await page.context().addCookies([
    { name: "rafal_guest_city_id", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
  if (options.authenticated) await page.context().addCookies([
    { name: "rafal_auth_access_token", value: "synthetic-auth", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  if (options.order) await page.addInitScript(({ order, phone, mismatch }) => {
    if (sessionStorage.getItem("payment-result-test-seeded")) return;
    sessionStorage.setItem("payment-result-test-seeded", "true");
    sessionStorage.setItem(`rafal:checkout:verification:${order}`, JSON.stringify({
      orderNumber: mismatch ? "RF-OTHER" : order, displayNumber: "10103", phone, verificationExpiresAt: "2020-01-01T00:00:00Z",
    }));
  }, { order: options.order, phone, mismatch: options.mismatch });
  if (options.blockedStorage) await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new Error("Storage blocked"); } });
  });
}

let requestOffset = 0;
test.beforeEach(async ({ request }) => {
  requestOffset = (await (await request.get("http://127.0.0.1:3101/__requests")).json()).length;
});
test.afterEach(async ({ request }) => {
  const requests = await (await request.get("http://127.0.0.1:3101/__requests")).json();
  expect(requests.slice(requestOffset).filter((r: { method: string; path: string }) => r.method !== "GET" && /\/checkout\/place|\/verify|\/charge|\/payment/.test(r.path))).toEqual([]);
});

for (const locale of ["ar", "en"]) {
  for (const authenticated of [false, true]) {
    test(`${locale} ${authenticated ? "authenticated" : "guest"}: confirmed payment, refresh, privacy, responsive and keyboard`, async ({ page }, info) => {
      await setup(page, { authenticated, order: authenticated ? undefined : "RF-10103" });
      let guestReads = 0;
      page.on("request", req => { if (new URL(req.url()).pathname === "/api/orders/lookup") guestReads++; });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const response = await page.goto(url(locale));
      expect(response?.headers()["cache-control"]).toContain("no-store");
      await expect(result(page)).toHaveAttribute("data-payment-result", "confirmed");
      expect(guestReads).toBe(authenticated ? 0 : 1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(locale === "ar" ? "تم تأكيد الدفع" : "Payment confirmed");
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(result(page)).toContainText("RF-10103");
      const body = await page.locator("body").innerText();
      for (const secret of [phone, "Synthetic Guest", "Synthetic Street", "synthetic-auth", "PRIVATE-PROVIDER-ERROR"]) expect(body).not.toContain(secret);
      expect(page.url()).not.toContain(phone);
      const html = await response!.text();
      expect(html).not.toContain(phone); expect(html).not.toContain("synthetic-auth");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
      await expect(result(page).getByRole("link").first()).toHaveAttribute("href", authenticated ? `/${locale}/account/orders/RF-10103` : `/${locale}/track-order`);
      const button = result(page).getByRole("button");
      await button.focus(); await expect(button).toBeFocused();
      expect(await button.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none");
      await page.keyboard.press("Tab"); await expect(result(page).getByRole("link").first()).toBeFocused();
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await result(page).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath(`${locale}-${authenticated ? "auth" : "guest"}-${width}.png`), fullPage: true });
      }
      await page.reload();
      await expect(result(page)).toHaveAttribute("data-payment-result", "confirmed");
      expect(guestReads).toBe(authenticated ? 0 : 2);
    });
  }
}

for (const [order, status, state] of [
  ["RF-PENDING", "success", "pending"], ["RF-FAILED", "success", "failed"],
  ["RF-FAILED", "failed", "failed"], ["RF-PENDING", "failed", "pending"],
  ["RF-10103", "failed", "confirmed"], ["RF-UNKNOWN", "success", "pending"],
  ["RF-CONTRADICTORY", "success", "pending"], ["RF-MISMATCH", "success", "unavailable"],
  ["RF-ERROR", "success", "unavailable"], ["RF-FORBIDDEN", "success", "unavailable"],
  ["RF-MALFORMED", "success", "unavailable"],
]) {
  test(`guest ${order} / ${status} resolves to ${state}`, async ({ page }) => {
    await setup(page, { order });
    await page.goto(url("en", order, status));
    await expect(result(page)).toHaveAttribute("data-payment-result", state);
    await expect(result(page)).not.toContainText("PRIVATE-PROVIDER-ERROR");
    await expect(result(page).getByRole("link").first()).toHaveAttribute("href", "/en/track-order");
    if (status === "failed" && state === "pending") await expect(result(page)).toContainText("does not confirm that your order was cancelled");
  });
}

test("invalid or missing query values never trigger a lookup", async ({ page }) => {
  await setup(page);
  let lookups = 0; page.on("request", req => { if (req.url().includes("/api/orders/lookup")) lookups++; });
  for (const query of ["", "?status=success", "?order_number=RF-10103", "?status=paid&order_number=RF-10103", "?status=success&status=failed&order_number=RF-10103", "?status=success&order_number=RF-10103&order_number=RF-OTHER", "?status=success&order_number=%3Cscript%3E", "?status=success&order_number=RF-10103%0A", "?status=success&order_number=%E0%A4%A"]) {
    await page.goto(`/en/checkout/payment-result${query}`);
    await expect(result(page)).toHaveAttribute("data-payment-result", "invalid");
  }
  expect(lookups).toBe(0);
});

for (const mode of ["missing", "mismatch", "blocked"] as const) {
  test(`guest ${mode} identity has safe recovery without a lookup`, async ({ page }) => {
    await setup(page, { order: mode === "mismatch" ? "RF-10103" : undefined, mismatch: true, blockedStorage: mode === "blocked" });
    let lookups = 0; page.on("request", req => { if (req.url().includes("/api/orders/lookup")) lookups++; });
    await page.goto(url("en", "RF-10103", "failed"));
    await expect(result(page)).toHaveAttribute("data-payment-result", "unavailable");
    await expect(result(page)).toContainText("reported an unsuccessful attempt");
    await page.reload(); await expect(result(page)).toHaveAttribute("data-payment-result", "unavailable");
    expect(lookups).toBe(0);
  });
}

for (const authenticated of [false, true]) {
  test(`${authenticated ? "auth" : "guest"}: stale read updates only on explicit recheck; back remains read-only`, async ({ page }) => {
    const order = authenticated ? "RF-STALE-AUTH" : "RF-STALE-GUEST";
    await setup(page, { authenticated, order: authenticated ? undefined : order });
    await page.goto(url("en", order));
    await expect(result(page)).toHaveAttribute("data-payment-result", "pending");
    await page.waitForTimeout(1200);
    await expect(result(page)).toHaveAttribute("data-payment-result", "pending");
    await result(page).getByRole("button").click();
    await expect(result(page)).toHaveAttribute("data-payment-result", "confirmed");
    await page.goto("/en/checkout/payment-result"); await page.goBack();
    await expect(result(page)).toHaveAttribute("data-payment-result", "confirmed");
  });
}

for (const order of ["RF-MISMATCH", "RF-FORBIDDEN", "RF-ERROR", "RF-MALFORMED"]) {
  test(`auth ${order}: unavailable without exposing order details`, async ({ page }) => {
    await setup(page, { authenticated: true });
    await page.goto(url("en", order));
    await expect(result(page)).toHaveAttribute("data-payment-result", "unavailable");
    await expect(result(page).getByRole("link").first()).toHaveAttribute("href", "/en/track-order");
    await expect(result(page)).not.toContainText("PRIVATE-PROVIDER-ERROR");
  });
}

test("slow/network-failed lookup has accessible progress, blocks duplicate reads and never retains success", async ({ page }) => {
  await setup(page, { order: "RF-10103" });
  await page.goto(url("en"));
  await expect(result(page)).toHaveAttribute("data-payment-result", "confirmed");
  let calls = 0;
  await page.route("**/api/orders/lookup", async route => {
    calls++; await new Promise(resolve => setTimeout(resolve, 700)); await route.abort();
  });
  await result(page).getByRole("button").click();
  await expect(result(page)).toHaveAttribute("data-payment-result", "checking");
  await expect(result(page).getByRole("status")).toContainText("Checking your payment");
  await expect(result(page).getByRole("button")).toBeDisabled();
  await expect(result(page)).toHaveAttribute("data-payment-result", "unavailable");
  expect(calls).toBe(1);
});
