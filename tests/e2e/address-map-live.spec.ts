import { test, expect } from "@playwright/test";

test.skip(process.env.MAP_E2E_LIVE !== "1", "Requires authorized live LocationIQ access");
// Never retain token-bearing network traces or raw provider payloads.
test.use({ trace: "off", screenshot: "off", video: "off" });

test("live Riyadh: real provider response fills available address fields", async ({ page }) => {
  await page.context().addCookies([
    { name: "rafal_guest_city_id", value: "1", domain: "127.0.0.1", path: "/" },
    { name: "rafal_cart_token", value: "synthetic-cart", domain: "127.0.0.1", path: "/" },
  ]);
  await page.route("**/*", route => {
    const host = new URL(route.request().url()).hostname;
    if (host === "127.0.0.1" || host === "eu1.locationiq.com" || /^[abc]-tiles\.locationiq\.com$/.test(host)) return route.continue();
    return route.abort();
  });
  await page.goto("/en/checkout");
  await page.getByRole("button", { name: "Choose location on map", exact: true }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === "/v1/reverse");
  await page.getByRole("button", { name: "Use map center", exact: true }).click();
  const response = await responsePromise;
  const headers = await response.request().allHeaders();
  console.log(JSON.stringify({ providerStatus: response.status(), hasContentType: "content-type" in headers, hasAuthorization: "authorization" in headers, hasCartToken: "x-cart-token" in headers }));
  expect(response.status()).toBe(200);
  expect(headers["content-type"]).toBeUndefined();
  expect(headers.authorization).toBeUndefined();
  expect(headers["x-cart-token"]).toBeUndefined();
  const payload = await response.json();
  const a = payload.address;
  expect(a?.country_code).toBe("sa");
  // Compare without putting geographic text in assertion diagnostics.
  const road = a.road ?? a.pedestrian ?? a.footway;
  const district = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? a.residential;
  expect(typeof road === "string" && typeof district === "string").toBe(true);
  await expect.poll(async () => (await page.locator("#checkout-district").inputValue()) === district.trim()).toBe(true);
  await expect.poll(async () => (await page.locator("#checkout-street-details").inputValue()).includes(road.trim())).toBe(true);
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1);
  await page.locator("#checkout-district").fill("Manual test district");
  await page.getByRole("button", { name: "Move map east", exact: true }).click();
  const next = page.waitForResponse(response => new URL(response.url()).pathname === "/v1/reverse");
  await page.getByRole("button", { name: "Use map center", exact: true }).click();
  await next;
  await expect(page.getByRole("status").filter({ hasText: "Finding address" })).toHaveCount(0);
  await expect(page.locator("#checkout-district")).toHaveValue("Manual test district");
  await expect(page.locator("#checkout-city")).toHaveValue("");
});
