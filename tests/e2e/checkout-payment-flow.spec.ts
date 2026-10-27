import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

test.skip(process.env.PAYMENT_FLOW_E2E !== "1", "Requires the opt-in local payment fixture backend");
const phone = "+966501234567";
type RecordedRequest = { path: string; method: string; fields?: Record<string, string>; authenticated: boolean };
const records = async (request: APIRequestContext): Promise<RecordedRequest[]> =>
  (await request.get("http://127.0.0.1:3101/__requests")).json();
const mutations = (rows: RecordedRequest[]) => rows.filter(row => row.method === "POST" && /\/place$|\/verify$|\/charge/.test(row.path));

for (const locale of ["ar", "en"]) {
  for (const method of ["card", "apple_pay", "tap"]) {
    test(`${locale} authenticated ${method}: observed hosted Place, identity and no replay`, async ({ page, request }) => {
      const offset = (await records(request)).length;
      await setup(page, "hosted", true);
      await page.setViewportSize({ width: locale === "ar" ? 390 : 1440, height: 900 });
      await page.goto(`/${locale}/checkout`);
      await page.getByText("Standard", { exact: true }).click();
      await page.locator(`#checkout-payment input[value="${method}"]`).check();
      const selectedLabel = await page.locator(`#checkout-payment input[value="${method}"]`).locator("..").locator("span.block").first().innerText();
      await expect(page.locator("#checkout-submitted-payment")).toContainText(selectedLabel);
      await expect(page.locator('#checkout-payment input[value="bank_transfer"]')).toHaveCount(0);
      const place = page.locator('button[aria-describedby="checkout-submitted-payment"]');
      await expect(place).toBeEnabled();
      await place.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
      await expect(page.getByRole("heading", { name: "Synthetic hosted checkout" })).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/${locale}/checkout$`));
      expect(await page.evaluate(() => {
        const handoff = JSON.parse(sessionStorage.getItem("rafal:checkout:payment:RF-E2E-HOSTED") ?? "null");
        return { order: handoff?.orderNumber, confirmation: sessionStorage.getItem("rafal:checkout:confirmation:RF-E2E-HOSTED") };
      })).toEqual({ order: "RF-E2E-HOSTED", confirmation: null });
      await page.evaluate(() => sessionStorage.removeItem("rafal:checkout:payment:RF-E2E-HOSTED"));
      await page.reload();
      await expect(page.locator("#checkout-order-otp")).toHaveCount(0);
      const calls = mutations((await records(request)).slice(offset));
      expect(calls.map(row => row.path)).toEqual(["/checkout/place"]);
      expect(calls[0].fields?.payment_method).toBe(method);
      expect(calls[0].authenticated).toBe(true);
    });
  }
}

for (const variant of ["unsafe", "expired", "missing", "mismatch"]) {
  test(`authenticated hosted ${variant}: safe locked failure without replay`, async ({ page, request }) => {
    const offset = (await records(request)).length;
    await setup(page, `hosted-${variant}`, true);
    await page.goto("/en/checkout");
    await page.getByText("Standard", { exact: true }).click();
    const place = page.locator('button[aria-describedby="checkout-submitted-payment"]');
    await expect(place).toBeEnabled();
    await place.click();
    await expect(page.getByText(/could not confirm whether/i)).toBeVisible();
    await expect(place).toBeDisabled();
    await page.reload();
    expect(mutations((await records(request)).slice(offset)).map(row => row.path)).toEqual(["/checkout/place"]);
    expect(await page.evaluate(() => sessionStorage.getItem("rafal:checkout:payment:RF-E2E-HOSTED"))).toBeNull();
  });
}

for (const variant of ["cardonly", "failed"]) {
  test(`authenticated discovery ${variant}: Card fallback without offering extra methods`, async ({ page, request }) => {
    const offset = (await records(request)).length;
    await setup(page, `hosted-${variant}`, true);
    await page.goto("/en/checkout");
    await page.getByText("Standard", { exact: true }).click();
    for (const method of ["apple_pay", "tap", "bank_transfer"]) await expect(page.locator(`#checkout-payment input[value="${method}"]`)).toHaveCount(0);
    const place = page.locator('button[aria-describedby="checkout-submitted-payment"]');
    await expect(place).toBeEnabled();
    await place.click();
    await expect(page.getByRole("heading", { name: "Synthetic hosted checkout" })).toBeVisible();
    expect(mutations((await records(request)).slice(offset))[0].fields?.payment_method).toBe("card");
  });
}

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
    { name: authenticated ? "rafal_auth_access_token" : "rafal_cart_token", value: authenticated ? (variant.startsWith("hosted") ? `synthetic-auth-${variant}` : "synthetic-auth") : `synthetic-payment-${variant}`, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" },
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

async function prepareCheckout(page: Page, locale: string, authenticated = false) {
  await page.goto(`/${locale}/checkout`);
  if (authenticated) await page.locator('button[aria-controls="checkout-one-time-address"]').click();
  await page.locator("#checkout-recipient-name").fill("Synthetic Buyer");
  await page.locator("#checkout-recipient-phone").fill("501234567");
  await page.locator("#checkout-city").selectOption("1");
  await page.locator("#checkout-district").fill("Synthetic District");
  await page.locator("#checkout-street-details").fill("Synthetic Street");
  await page.locator('#checkout-destination button[type="submit"]').click();
  if (!authenticated) {
    await page.locator("#checkout-buyer-name").fill("Synthetic Buyer");
    await page.locator("#checkout-buyer-email").fill("buyer@example.invalid");
    await page.locator("#checkout-buyer-phone").fill("501234567");
    await page.locator('#checkout-buyer button[type="submit"]').click();
  }
  await page.getByText("Standard", { exact: true }).click();
}

for (const locale of ["ar", "en"]) {
  test(`${locale} hiding a one-time address preserves the unfinished draft`, async ({ page, request }) => {
    const offset = (await records(request)).length;
    await setup(page, "false", true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}/checkout`);
    const toggle = page.locator('button[aria-controls="checkout-one-time-address"]');
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.locator("#checkout-recipient-name").fill("Unfinished Recipient");
    await page.locator("#checkout-city").selectOption("2");
    await page.locator("#checkout-district").fill("Unfinished District");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#checkout-recipient-name")).not.toBeVisible();
    await toggle.click();
    await expect(page.locator("#checkout-recipient-name")).toHaveValue("Unfinished Recipient");
    await expect(page.locator("#checkout-city")).toHaveValue("2");
    await expect(page.locator("#checkout-district")).toHaveValue("Unfinished District");
    await expect(page.locator('button[aria-describedby="checkout-submitted-payment"]')).toBeDisabled();
    expect(mutations((await records(request)).slice(offset))).toEqual([]);
  });

  for (const authenticated of [false, true]) {
    test(`${locale} ${authenticated ? "User" : "Guest"} delivery edits require saving and refreshed shipping before Place`, async ({ page, request }) => {
      const offset = (await records(request)).length;
      await setup(page, "false", authenticated);
      await page.setViewportSize({ width: 390, height: 844 });
      await prepareCheckout(page, locale, authenticated);
      const place = page.locator('button[aria-describedby="checkout-submitted-payment"]');
      await expect(place).toBeEnabled();
      for (const [selector, value] of [
        ["#checkout-recipient-name", "Updated Recipient"],
        ["#checkout-recipient-phone", "509876543"],
        ["#checkout-district", "Updated District"],
        ["#checkout-street-details", "Updated Street"],
      ]) {
        await page.locator(selector).fill(value);
        await expect(place).toBeDisabled();
        await expect(page.locator('input[name="checkout-shipping-method"]')).toHaveCount(0);
        await page.locator('#checkout-destination button[type="submit"]').focus();
        await page.keyboard.press("Enter");
        await expect(page.locator(selector)).toHaveValue(value);
        await expect(place).toBeDisabled();
        await page.getByText("Standard", { exact: true }).click();
        await expect(place).toBeEnabled();
      }
      await page.locator("#checkout-city").selectOption("2");
      await expect(place).toBeDisabled();
      await page.locator("#checkout-street-details").fill("");
      await page.locator('#checkout-destination button[type="submit"]').click();
      await expect(page.locator("#checkout-street-details")).toHaveAttribute("aria-invalid", "true");
      await expect(place).toBeDisabled();
      if (!authenticated) await expect(page.locator("#checkout-buyer-name")).toHaveValue("Synthetic Buyer");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(mutations((await records(request)).slice(offset))).toEqual([]);
    });
  }

  for (const variant of ["false", "true"]) {
    test(`${locale} Guest Place → OTP (${variant}) → hosted: one mutation each, no confirmation`, async ({ page, request }) => {
      const offset = (await records(request)).length;
      await setup(page, variant);
      await page.setViewportSize({ width: locale === "ar" ? 390 : 1440, height: 900 });
      await prepareCheckout(page, locale);
      const card = page.locator('#checkout-payment input[value="card"]');
      await expect(card).toBeChecked();
      await expect(page.locator('#checkout-payment input[value="apple_pay"]')).toBeDisabled();
      await expect(page.locator('#checkout-payment input[value="bank_transfer"]')).toHaveCount(0);
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
    await prepareCheckout(page, "en");
    await expect(page.locator('#checkout-payment input[value="card"]')).toHaveCount(0);
    await expect(page.locator("#checkout-submitted-payment")).toContainText("Card / Mada");
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
