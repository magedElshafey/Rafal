import { test, expect, type Page } from "@playwright/test";
import fixtures from "../fixtures/address-map-provider.json";

test.skip(Boolean(process.env.MAP_E2E_NO_TOKEN), "Run the missing-token suite instead");

const openLabel = /Choose location on map|اختيار الموقع على الخريطة/;
const closeLabel = /Close map|إغلاق الخريطة/;
async function setup(page: Page, authenticated = false, gift = false) {
  await page.context().addCookies([
    { name: "rafal_guest_city_id", value: "1", domain: "127.0.0.1", path: "/" },
    { name: "rafal_cart_token", value: gift ? "synthetic-gift" : "synthetic-cart", domain: "127.0.0.1", path: "/" },
    ...(authenticated ? [{ name: "rafal_auth_access_token", value: "synthetic-auth", domain: "127.0.0.1", path: "/" }] : []),
  ]);
  // Block every external request unless explicitly mocked. No real provider calls.
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") return route.continue();
    if (url.hostname.endsWith("-tiles.locationiq.com")) return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
    return route.abort();
  });
  await page.route("https://eu1.locationiq.com/v1/reverse**", route => route.fulfill({ json: { address: { ...fixtures.Riyadh.address, suburb: "Map District", road: "Map Street" } } }));
}
async function openMap(page: Page) {
  await page.getByRole("button", { name: openLabel }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
}

test("Saudi navigation envelope and zoom limits keep one map instance", async ({ page }) => {
  await setup(page);
  const zooms: number[] = [];
  let point: { lat: number; lng: number } | undefined;
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.hostname.endsWith("-tiles.locationiq.com")) zooms.push(Number(url.pathname.split("/")[4]));
    if (url.pathname === "/v1/reverse") point = { lat: Number(url.searchParams.get("lat")), lng: Number(url.searchParams.get("lon")) };
  });
  await page.goto("/en/checkout");
  await openMap(page);
  const map = page.locator(".leaflet-container");
  const id = await map.evaluate(el => (el as HTMLElement & { _leaflet_id: number })._leaflet_id);
  await page.getByRole("button", { name: "Use map center", exact: true }).click();
  await expect.poll(() => point?.lat).toBeCloseTo(24.7136, 2);
  await expect.poll(() => point?.lng).toBeCloseTo(46.6753, 2);
  expect(zooms).toContain(11);
  for (let i = 0; i < 10; i++) await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  expect(Math.min(...zooms)).toBe(6);
  for (let i = 0; i < 25; i++) await page.getByRole("button", { name: "Move map east", exact: true }).click();
  await page.getByRole("button", { name: "Use map center", exact: true }).click();
  await expect.poll(() => point?.lng).toBeGreaterThan(46.7);
  expect(point!.lng).toBeLessThanOrEqual(56);
  expect(point!.lat).toBeGreaterThanOrEqual(16);
  expect(point!.lat).toBeLessThanOrEqual(33);
  for (let i = 0; i < 15; i++) await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  expect(Math.max(...zooms)).toBe(18);
  expect(await map.evaluate(el => (el as HTMLElement & { _leaflet_id: number })._leaflet_id)).toBe(id);
});

for (const [name, address, status] of [
  ["district-only", { country_code: "sa", city_district: "Test District" }, "Only some address details"],
  ["street-only", { country_code: "sa", pedestrian: "Test Street", house_number: "12" }, "Only some address details"],
  ["remote", fixtures.Remote.address, "No reliable Saudi address details"],
  ["outside", fixtures.Outside.address, "outside Saudi Arabia"],
  ["unknown", { road: "Unverified Road" }, "did not identify a reliable country"],
] as const) {
  test(`${name}: accurate feedback and eligible autofill without selecting a city`, async ({ page }) => {
    await setup(page);
    await page.route("https://eu1.locationiq.com/v1/reverse**", route => route.fulfill({ json: { address } }));
    await page.goto("/en/checkout");
    await openMap(page);
    await page.getByRole("button", { name: "Use map center", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: status })).toBeVisible();
    await expect(page.locator("#checkout-district")).toHaveValue(name === "district-only" ? "Test District" : "");
    await expect(page.locator("#checkout-street-details")).toHaveValue(name === "street-only" ? "12 Test Street" : "");
    await expect(page.locator("#checkout-city")).toHaveValue("");
  });
}

for (const locale of ["en", "ar"]) {
  test(`${locale}: Guest Checkout lazy map, marker, protected manual edits, city invalidation and cleanup`, async ({ page }, testInfo) => {
    await setup(page);
    const providerRequests: string[] = [];
    page.on("request", request => { if (request.url().includes("locationiq.com")) providerRequests.push(request.url()); });
    await page.goto(`/${locale}/checkout`);
    await expect(page.getByRole("button", { name: openLabel })).toBeVisible();
    expect(providerRequests).toHaveLength(0);
    // Turbopack loads a small async-loader stub eagerly; the Leaflet runtime itself must stay deferred.
    expect(await page.evaluate(() => performance.getEntriesByType("resource").some(entry => /leaflet-src.*\.js/.test(entry.name)))).toBe(false);
    expect(await page.evaluate(() => Boolean(document.querySelector(".leaflet-container")))).toBe(false);
    await openMap(page);
    expect(await page.evaluate(() => performance.getEntriesByType("resource").some(entry => /leaflet-src.*\.js/.test(entry.name)))).toBe(true);
    const map = page.locator(".leaflet-container");
    await map.click({ position: { x: 100, y: 100 } });
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1);
    await expect(page.locator("#checkout-district")).toHaveValue("Map District");
    await expect(page.locator("#checkout-street-details")).toHaveValue("Map Street");
    await page.screenshot({ path: testInfo.outputPath(`map-${locale}.png`), fullPage: true });
    await expect(page.locator("#checkout-city")).toHaveValue("");
    const mapId = await map.evaluate(element => (element as HTMLElement & { _leaflet_id: number })._leaflet_id);
    const lookups = providerRequests.filter(url => url.includes("/reverse")).length;
    await page.locator("#checkout-district").fill("");
    expect(await map.evaluate(element => (element as HTMLElement & { _leaflet_id: number })._leaflet_id)).toBe(mapId);
    expect(providerRequests.filter(url => url.includes("/reverse"))).toHaveLength(lookups);
    await map.click({ position: { x: 150, y: 150 } });
    await expect(page.getByRole("status").filter({ hasText: /District and street suggestions|تتوفر اقتراحات للحي والشارع/ })).toBeVisible();
    await expect(page.locator("#checkout-district")).toHaveValue("");
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1);
    await page.getByRole("button", { name: /Replace district|استبدال الحي/ }).click();
    await expect(page.locator("#checkout-district")).toHaveValue("Map District");
    await page.locator("#checkout-city").selectOption("2");
    await expect(page.locator("#checkout-city")).toHaveValue("2");
    await expect(page.locator("#checkout-city option[value='2']")).toHaveText("Riyadh — Other Region");
    await page.getByRole("button", { name: closeLabel }).last().click();
    await expect(map).toHaveCount(0);
    await openMap(page);
    await expect(map).toHaveCount(1);
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(0);
    await page.getByRole("button", { name: /Use map center|استخدام مركز الخريطة/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  });
}

test("Address Book add/edit modal, protected saved values, explicit replacement and exact update payload", async ({ page, request }) => {
  await setup(page, true);
  await page.goto("/en/account/addresses");
  await page.getByRole("button", { name: /edit/i }).first().click();
  await openMap(page);
  await page.getByRole("button", { name: "Use map center", exact: true }).click();
  await expect(page.getByRole("button", { name: /Replace district/ })).toBeVisible();
  await expect(page.locator("input[name='district']")).toHaveValue("Saved District");
  await page.getByRole("button", { name: /Replace district/ }).click();
  await expect(page.locator("input[name='district']")).toHaveValue("Map District");
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const calls = await (await request.get("http://127.0.0.1:3101/__requests")).json();
  const update = calls.filter((call: { path: string; method: string }) => call.path === "/addresses/1" && call.method === "PUT").at(-1);
  expect(JSON.parse(update.body)).toEqual({ district: "Map District", street_details: "Map Street" });
  await page.getByRole("button", { name: /add.*address/i }).first().click();
  await openMap(page);
  await expect(page.locator("input[name='district']")).toHaveValue("");
  await expect(page.locator(".leaflet-container")).toHaveCount(1);
});

for (const surface of ["cart", "checkout"]) {
  test(`${surface}: gift editor uses shared map without a Cart mutation`, async ({ page, request }) => {
    await setup(page, false, true);
    await page.goto(`/en/${surface}`);
    await page.getByRole("button", { name: surface === "cart" ? "Edit recipient" : "Edit recipient details", exact: true }).click();
    const before = await (await request.get("http://127.0.0.1:3101/__requests")).json();
    await openMap(page);
    await page.getByRole("button", { name: "Use map center", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "District", exact: true })).toHaveValue("Map District");
    await page.getByRole("textbox", { name: "District", exact: true }).fill("Manual gift district");
    const after = await (await request.get("http://127.0.0.1:3101/__requests")).json();
    expect(after.slice(before.length).filter((call: { method: string }) => call.method !== "GET")).toEqual([]);
  });
}

test("late lookup cannot overwrite edits or survive a city change", async ({ page }) => {
  await setup(page);
  let finish: (() => Promise<void>) | undefined;
  await page.route("https://eu1.locationiq.com/v1/reverse**", route => new Promise<void>(resolve => {
    finish = async () => { await route.fulfill({ json: { address: { country_code: "sa", suburb: "Late", road: "Late" } } }).catch(() => {}); resolve(); };
  }));
  await page.goto("/en/checkout");
  await openMap(page);
  await page.getByRole("button", { name: "Use map center", exact: true }).click();
  await expect.poll(() => Boolean(finish)).toBe(true);
  await page.locator("#checkout-district").fill("Manual");
  await page.locator("#checkout-city").selectOption("2");
  await finish!();
  await expect(page.locator("#checkout-district")).toHaveValue("Manual");
  await expect(page.locator("#checkout-street-details")).toHaveValue("");
});

test("authenticated Checkout saved selection unchanged; one-time map is available", async ({ page }) => {
  await setup(page, true);
  await page.goto("/en/checkout");
  await expect(page.locator("input[name='checkout-saved-address']")).toBeChecked();
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
  await page.getByRole("button", { name: /one-time|different address/i }).click();
  await openMap(page);
  await page.getByRole("button", { name: "Use map center", exact: true }).click();
  await expect(page.locator("#checkout-district")).toHaveValue("Map District");
  await expect(page.locator("input[name='checkout-saved-address']")).toBeChecked();
});

test("mobile provider outage preserves manual inputs and does not overflow viewport", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await setup(page);
  await page.route("https://eu1.locationiq.com/v1/reverse**", route => route.fulfill({ status: 429, json: { error: "rate limited" } }));
  await page.goto("/en/checkout");
  await openMap(page);
  await page.getByRole("button", { name: "Use map center", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Address lookup failed" })).toBeVisible();
  await page.locator("#checkout-district").fill("Manual");
  await expect(page.locator("#checkout-district")).toHaveValue("Manual");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("map-mobile.png"), fullPage: true });
  await context.close();
});
