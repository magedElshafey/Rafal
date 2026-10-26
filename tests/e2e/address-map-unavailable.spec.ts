import { test, expect } from "@playwright/test";

test.skip(!process.env.MAP_E2E_NO_TOKEN, "Requires an explicitly empty public token");

test("missing token: keyboard manual Checkout address still commits with the same payload", async ({ page, request }) => {
  await page.context().addCookies([
    { name: "rafal_guest_city_id", value: "1", domain: "127.0.0.1", path: "/" },
    { name: "rafal_cart_token", value: "synthetic-cart", domain: "127.0.0.1", path: "/" },
  ]);
  const external: string[] = [];
  await page.route("**/*", route => {
    if (new URL(route.request().url()).hostname === "127.0.0.1") return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  await page.goto("/en/checkout");
  await page.getByRole("button", { name: "Choose location on map" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("The map is unavailable. You can still enter and save your address manually.")).toBeVisible();
  for (const [selector, value] of [["#checkout-recipient-name", "Keyboard Buyer"], ["#checkout-recipient-phone", "501234567"], ["#checkout-district", "Manual"], ["#checkout-street-details", "Street"]]) {
    await page.locator(selector).focus();
    await page.keyboard.type(value);
  }
  await page.locator("#checkout-city").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Use this address", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("This delivery address is now selected.")).toBeVisible();
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
  expect(external.filter(url => url.includes("locationiq"))).toEqual([]);
  await expect.poll(async () => {
    const calls = await (await request.get("http://127.0.0.1:3101/__requests")).json();
    const quote = calls.filter((call: { path: string }) => call.path === "/checkout/quote").at(-1);
    return quote?.fields ?? null;
  }).toEqual({ city_id: "1", "address[recipient_name]": "Keyboard Buyer", "address[recipient_phone]": "+966501234567", "address[city_id]": "1", "address[district]": "Manual", "address[street_details]": "Street" });
});
