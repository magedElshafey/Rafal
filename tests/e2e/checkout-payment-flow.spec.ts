import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

test.skip(process.env.PAYMENT_FLOW_E2E !== "1", "Requires the opt-in local payment fixture backend");
const phone = "+966501234567";
type RecordedRequest = { path: string; method: string; fields?: Record<string, string>; authenticated: boolean };
const records = async (request: APIRequestContext): Promise<RecordedRequest[]> =>
  (await request.get("http://127.0.0.1:3101/__requests")).json();
const mutations = (rows: RecordedRequest[]) => rows.filter(row => row.method === "POST" && /\/place$|\/verify$|\/charge/.test(row.path));

async function setup(page: Page, variant = "false", authenticated = false) {
  await page.route("**/*", route => {
    const host = new URL(route.request().url()).hostname;
    if (host === "127.0.0.1") return route.continue();
    // Intercept navigation before any provider request leaves the browser.
    if (host === "checkout.tap.company") return route.fulfill({ contentType: "text/html", body: "<h1>Synthetic hosted checkout</h1>" });
    return route.abort();
  });
  await page.context().addCookies([
    { name: "rafal_guest_city_id", value: "1", domain: "127.0.0.1", path: "/" },
    { name: authenticated ? "rafal_auth_access_token" : "rafal_cart_token", value: authenticated ? "synthetic-auth" : `synthetic-payment-${variant}`, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}

async function seedVerification(page: Page, order: string) {
  await page.addInitScript(({ order, phone }) => {
    sessionStorage.setItem(`rafal:checkout:verification:${order}`, JSON.stringify({
      orderNumber: order, displayNumber: order, phone, verificationExpiresAt: null,
    }));
  }, { order, phone });
}

async function submitOtp(page: Page) {
  await page.locator("#checkout-order-otp").fill("123456");
  // Two synchronous submissions exercise the component's in-flight guard.
  await page.locator("#checkout-order-otp").evaluate(input => {
    const form = input.closest("form")!;
    form.requestSubmit(); form.requestSubmit();
  });
}

async function prepareGuest(page: Page, locale: string) {
  await page.goto(`/${locale}/checkout`);
  await page.locator("#checkout-recipient-name").fill("Synthetic Buyer");
  await page.locator("#checkout-recipient-phone").fill("501234567");
  await page.locator("#checkout-city").selectOption("1");
  await page.locator("#checkout-district").fill("Synthetic District");
  await page.locator("#checkout-street-details").fill("Synthetic Street");
  await page.locator('#checkout-destination button[type="submit"]').click();
  await page.locator("#checkout-buyer-name").fill("Synthetic Buyer");
  await page.locator("#checkout-buyer-email").fill("buyer@example.invalid");
  await page.locator("#checkout-buyer-phone").fill("501234567");
  await page.locator('#checkout-buyer button[type="submit"]').click();
  await page.getByText("Standard", { exact: true }).click();
}

for (const locale of ["ar", "en"]) {
  for (const variant of ["false", "true"]) {
    test(`${locale} Guest Place → OTP (${variant}) → hosted: one mutation each, no confirmation`, async ({ page, request }) => {
      const offset = (await records(request)).length;
      await setup(page, variant);
      await page.setViewportSize({ width: locale === "ar" ? 390 : 1440, height: 900 });
      await prepareGuest(page, locale);
      const card = page.locator('#checkout-payment input[value="card"]');
      await expect(card).toBeChecked();
      await expect(page.locator('#checkout-payment input[value="apple_pay"]')).toBeDisabled();
      await expect(page.locator('#checkout-payment input[value="bank_transfer"]')).toBeDisabled();
      await expect(page.locator('#checkout-payment input[value="tap"]')).toHaveCount(0);
      const place = page.locator('button[aria-describedby="checkout-submitted-payment"]');
      await expect(place).toBeEnabled();
      await place.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
      const order = `RF-E2E-${variant.toUpperCase()}`;
      await expect(page).toHaveURL(new RegExp(`/${locale}/orders/${order}/verify$`));
      await submitOtp(page);
      await expect(page.getByRole("heading", { name: "Synthetic hosted checkout" })).toBeVisible();
      await page.goto(`http://127.0.0.1:3100/${locale}/orders/${order}/verify`);
      await expect(page.locator("#checkout-order-otp")).toHaveCount(0);
      await page.reload();
      await expect(page.locator("#checkout-order-otp")).toHaveCount(0);
      expect(await page.evaluate(order => sessionStorage.getItem(`rafal:checkout:confirmation:${order}`), order)).toBeNull();
      const calls = mutations((await records(request)).slice(offset));
      expect(calls.map(row => row.path)).toEqual(["/checkout/place", `/checkout/orders/${order}/verify`]);
      expect(calls[0].fields?.payment_method).toBe("card");
      expect(calls[0].authenticated).toBe(false);
    });
  }

  test(`${locale} authenticated existing confirmed Place branch (fixture coverage, not new backend evidence)`, async ({ page, request }) => {
    const offset = (await records(request)).length;
    await setup(page, "false", true);
    await page.goto(`/${locale}/checkout`);
    await page.getByText("Standard", { exact: true }).click();
    const place = page.locator('button[aria-describedby="checkout-submitted-payment"]');
    await expect(place).toBeEnabled();
    await place.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/orders/RF-E2E-CONFIRMED/confirmation$`));
    const calls = mutations((await records(request)).slice(offset));
    expect(calls.map(row => row.path)).toEqual(["/checkout/place"]);
    expect(calls[0].authenticated).toBe(true);
    expect(calls[0].fields?.payment_method).toBe("card");
    expect(calls[0].fields?.["guest[phone]"]).toBeUndefined();
  });
}

for (const scenario of ["missing", "empty", "failed"]) {
  test(`discovery ${scenario}: declared Card checkout remains usable without duplicate Place`, async ({ page, request }) => {
    const offset = (await records(request)).length;
    await setup(page, scenario);
    await prepareGuest(page, "en");
    await expect(page.locator('#checkout-payment input[value="card"]')).toHaveCount(0);
    await expect(page.locator("#checkout-submitted-payment")).toContainText("card / Mada");
    const place = page.locator('button[aria-describedby="checkout-submitted-payment"]');
    await expect(place).toBeEnabled();
    await place.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
    await expect(page).toHaveURL(/\/orders\/RF-E2E-FALSE\/verify$/);
    const calls = mutations((await records(request)).slice(offset));
    expect(calls.map(row => row.path)).toEqual(["/checkout/place"]);
    expect(calls[0].fields?.payment_method).toBe("card");
  });
}

for (const scenario of ["UNSAFE", "EXPIRED", "MISSING", "MISMATCH", "MALFORMED"]) {
  test(`Guest Verify ${scenario}: safe error without navigation or automatic replay`, async ({ page, request }) => {
    const offset = (await records(request)).length;
    await setup(page);
    const order = `RF-E2E-${scenario}`;
    await seedVerification(page, order);
    await page.goto(`/en/orders/${order}/verify`);
    await submitOtp(page);
    await expect(page.locator("#checkout-order-verification-error")).toContainText("could not be verified");
    await expect(page).toHaveURL(new RegExp(`/orders/${order}/verify$`));
    expect(await page.evaluate(order => sessionStorage.getItem(`rafal:checkout:payment:${order}`), order)).toBeNull();
    expect(mutations((await records(request)).slice(offset)).map(row => row.path)).toEqual([`/checkout/orders/${order}/verify`]);
  });
}

test("missing OTP handoff recovers without a payment mutation", async ({ page, request }) => {
  const offset = (await records(request)).length;
  await setup(page);
  await page.goto("/en/orders/RF-E2E-FALSE/verify");
  await expect(page.getByRole("heading", { name: "Order verification context is unavailable" })).toBeVisible();
  await expect(page.locator("#checkout-order-otp")).toHaveCount(0);
  await page.reload();
  expect(mutations((await records(request)).slice(offset))).toEqual([]);
});
