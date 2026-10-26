import { test, expect, type Page } from "@playwright/test";
import fixtures from "../fixtures/address-map-provider.json";

test.skip(Boolean(process.env.MAP_E2E_NO_TOKEN), "Run the missing-token suite instead");
const openLabel = /Choose location on map|اختيار الموقع على الخريطة/;
const title = /Choose your delivery location|حدد موقع التوصيل/;
const reviewLabel = /Review location|مراجعة الموقع/;
const confirmLabel = /Confirm location|تأكيد الموقع/;
const backLabel = /Back to address|العودة للعنوان/;
const points: Record<string, [number, number]> = { Riyadh: [24.7, 46.7], Jeddah: [21.5, 39.2], Dammam: [26.4, 50.1] };
function forward(city: string, region: string) {
  const [lat, lng] = points[city] ?? points.Riyadh;
  return [{ class: "place", type: "city", lat: String(lat), lon: String(lng), boundingbox: [String(lat - .08), String(lat + .08), String(lng - .08), String(lng + .08)], address: { city, state: region, country_code: "sa" } }];
}
async function setup(page: Page, authenticated = false, gift = false) {
  const observed = { forward: 0, reverse: 0, zooms: [] as number[], points: [] as [number, number][] };
  let city = "Riyadh", region = "Riyadh Region";
  await page.context().addCookies([
    { name: "rafal_guest_city_id", value: "1", domain: "127.0.0.1", path: "/" },
    { name: "rafal_cart_token", value: gift ? "synthetic-gift" : "synthetic-cart", domain: "127.0.0.1", path: "/" },
    ...(authenticated ? [{ name: "rafal_auth_access_token", value: "synthetic-auth", domain: "127.0.0.1", path: "/" }] : []),
  ]);
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") return route.continue();
    if (url.hostname.endsWith("-tiles.locationiq.com")) {
      observed.zooms.push(Number(url.pathname.split("/")[4]));
      return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
    }
    return route.abort();
  });
  await page.route("https://eu1.locationiq.com/v1/search**", route => {
    observed.forward++;
    const query = new URL(route.request().url()).searchParams;
    city = query.get("city")!; region = query.get("state")!;
    return route.fulfill({ json: forward(city, region) });
  });
  await page.route("https://eu1.locationiq.com/v1/reverse**", route => {
    observed.reverse++;
    const query = new URL(route.request().url()).searchParams;
    observed.points.push([Number(query.get("lat")), Number(query.get("lon"))]);
    return route.fulfill({ json: { address: { ...fixtures.Riyadh.address, city, state: region, suburb: "Map District", road: "Map Street" } } });
  });
  return observed;
}
async function openMap(page: Page) {
  await page.getByRole("button", { name: openLabel }).click();
  await expect(page.getByRole("dialog", { name: title })).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
}
async function chooseCity(page: Page, id: string) {
  await page.getByRole("dialog", { name: title }).getByRole("combobox").selectOption(id);
  await expect(page.getByRole("button", { name: reviewLabel })).toBeEnabled();
}
async function review(page: Page) {
  await page.getByRole("button", { name: reviewLabel }).click();
  await expect(page.getByRole("button", { name: confirmLabel, exact: true })).toBeEnabled();
}

for (const locale of ["en", "ar"]) {
  test(`${locale}: explicit Guest confirmation, protected edits, keyboard, lazy loading and cleanup`, async ({ page }, info) => {
    const calls = await setup(page);
    let leafletModules = 0;
    const scripts: Promise<void>[] = [];
    page.on("response", response => {
      if (new URL(response.url()).pathname.endsWith(".js")) {
        scripts.push(response.text().then(body => {
          if (body.includes("Map container is already initialized.")) leafletModules++;
        }));
      }
    });
    await page.goto(`/${locale}/checkout`);
    await expect(page.getByRole("button", { name: openLabel })).toBeVisible();
    await Promise.all(scripts);
    expect(leafletModules).toBe(0);
    expect(calls.zooms).toEqual([]);
    expect(await page.evaluate(() => performance.getEntriesByType("resource").some(entry => /leaflet-src.*\.js/.test(entry.name)))).toBe(false);
    await openMap(page);
    await Promise.all(scripts);
    expect(leafletModules).toBeGreaterThan(0);
    await chooseCity(page, "1");
    expect(calls.reverse).toBe(0); // City focus itself must never reverse-geocode.
    await review(page);
    await expect(page.locator("#checkout-district")).toHaveValue("");
    await expect(page.locator("#checkout-street-details")).toHaveValue("");
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(0);
    await expect(page.getByRole("img", { name: /Candidate location|الموقع المقترح/ })).toHaveCount(1);
    await page.screenshot({ path: info.outputPath(`desktop-${locale}-preview.png`) });
    await page.getByRole("button", { name: confirmLabel }).click();
    await expect(page.getByRole("dialog", { name: title })).toHaveCount(0);
    await expect(page.locator("#checkout-district")).toHaveValue("Map District");
    await expect(page.locator("#checkout-street-details")).toHaveValue("Map Street");
    await expect(page.getByRole("button", { name: openLabel })).toBeFocused();
    await page.locator("#checkout-district").fill("");
    await page.locator("#checkout-street-details").fill("Manual street");
    const before = { forward: calls.forward, reverse: calls.reverse };
    await openMap(page);
    await expect(page.getByRole("button", { name: reviewLabel })).toBeEnabled();
    expect(calls.forward).toBe(before.forward); // Per-form city viewport cache.
    await page.locator(".leaflet-container").press("ArrowRight");
    await expect(page.getByRole("button", { name: confirmLabel })).toBeEnabled();
    await page.getByRole("button", { name: confirmLabel }).click();
    await expect(page.locator("#checkout-district")).toHaveValue("");
    await expect(page.locator("#checkout-street-details")).toHaveValue("Manual street");
    await openMap(page); await review(page);
    await page.getByRole("checkbox", { name: /Replace my existing|استبدال الحي/ }).check();
    await page.getByRole("button", { name: confirmLabel }).click();
    await expect(page.locator("#checkout-district")).toHaveValue("Map District");
    await expect(page.locator("#checkout-city")).toHaveValue("1");
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await openMap(page);
    await page.getByRole("button", { name: backLabel }).press("Escape");
    await expect(page.getByRole("dialog", { name: title })).toHaveCount(0);
    await expect(page.locator(".leaflet-container")).toHaveCount(0);
  });
}

test("Riyadh/Jeddah/Dammam city focus and switching preserve the same map", async ({ page }, info) => {
  const calls = await setup(page);
  await page.goto("/en/checkout"); await openMap(page);
  const map = page.locator(".leaflet-container");
  const id = await map.evaluate(el => (el as HTMLElement & { _leaflet_id: number })._leaflet_id);
  for (const [cityId, name] of [["1", "Riyadh"], ["3", "Jeddah"], ["4", "Dammam"]]) {
    const priorReverse = calls.reverse;
    await chooseCity(page, cityId);
    expect(calls.reverse).toBe(priorReverse);
    await review(page);
    const point = calls.points.at(-1)!;
    expect(point[0]).toBeCloseTo(points[name][0], 1);
    expect(point[1]).toBeCloseTo(points[name][1], 1);
    expect(await map.evaluate(el => (el as HTMLElement & { _leaflet_id: number })._leaflet_id)).toBe(id);
    if (name !== "Dammam") await page.screenshot({ path: info.outputPath(`selected-${name}.png`) });
  }
  await expect(page.locator("#checkout-district")).toHaveValue("");
  await page.getByRole("button", { name: backLabel }).click();
  await expect(page.locator("#checkout-city")).toHaveValue("4");
});

test("desktop dragging only looks up the stopped center; bounds and zoom remain constrained", async ({ page }) => {
  const calls = await setup(page);
  await page.goto("/en/checkout"); await openMap(page); await chooseCity(page, "1");
  const map = page.locator(".leaflet-container");
  const box = (await map.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 30, { steps: 12 });
  expect(calls.reverse).toBe(0);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: confirmLabel })).toBeEnabled();
  expect(calls.reverse).toBe(1);
  expect(Math.abs(calls.points[0][1] - 46.7)).toBeGreaterThan(.001);
  for (let i = 0; i < 10; i++) await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  expect(Math.min(...calls.zooms)).toBe(6);
  for (let i = 0; i < 35; i++) await map.press("ArrowRight");
  await expect(page.getByRole("button", { name: confirmLabel })).toBeEnabled();
  expect(calls.points.at(-1)![1]).toBeLessThanOrEqual(56);
  for (let i = 0; i < 15; i++) await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  expect(Math.max(...calls.zooms)).toBe(18);
});

test("Address Book add/edit nested modal, replacement and exact changed-fields payload", async ({ page, request }) => {
  await setup(page, true); await page.goto("/en/account/addresses");
  await page.getByRole("button", { name: /edit/i }).first().click();
  await openMap(page); await review(page);
  await expect(page.locator("input[name='district']")).toHaveValue("Saved District");
  await page.getByRole("checkbox", { name: /Replace my existing/ }).check();
  await page.getByRole("button", { name: confirmLabel }).click();
  await expect(page.locator("input[name='district']")).toHaveValue("Map District");
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const calls = await (await request.get("http://127.0.0.1:3101/__requests")).json();
  const update = calls.filter((call: { path: string; method: string }) => call.path === "/addresses/1" && call.method === "PUT").at(-1);
  expect(JSON.parse(update.body)).toEqual({ district: "Map District", street_details: "Map Street" });
  await page.getByRole("button", { name: /add.*address/i }).first().click();
  await openMap(page); await chooseCity(page, "1"); await review(page);
  await page.getByRole("button", { name: confirmLabel }).click();
  await expect(page.locator("input[name='district']")).toHaveValue("Map District");
});

for (const surface of ["cart", "checkout"]) {
  test(`${surface} gift: confirmation changes only draft fields, never Cart`, async ({ page, request }) => {
    await setup(page, false, true); await page.goto(`/en/${surface}`);
    await page.getByRole("button", { name: surface === "cart" ? "Edit recipient" : "Edit recipient details", exact: true }).click();
    const before = await (await request.get("http://127.0.0.1:3101/__requests")).json();
    await openMap(page); await review(page);
    await expect(page.getByRole("textbox", { name: "District", exact: true, includeHidden: true })).toHaveValue("");
    await page.getByRole("button", { name: confirmLabel }).click();
    await expect(page.getByRole("textbox", { name: "District", exact: true })).toHaveValue("Map District");
    const after = await (await request.get("http://127.0.0.1:3101/__requests")).json();
    // Next's background route prefetch can resolve the existing browsing city.
    // That POST is a read contract, not a Cart/address mutation.
    const newCalls = after.slice(before.length) as { method: string; path: string; body?: string }[];
    for (const call of newCalls.filter(call => call.path === "/locations/resolve")) {
      expect(call.method).toBe("POST");
      expect(JSON.parse(call.body!)).toEqual({ city_id: 1 });
    }
    expect(newCalls.filter(call => call.method !== "GET" && call.path !== "/locations/resolve")).toEqual([]);
  });
}

test("authenticated saved selection unchanged by optional one-time picker", async ({ page }) => {
  await setup(page, true); await page.goto("/en/checkout");
  await expect(page.locator("input[name='checkout-saved-address']")).toBeChecked();
  await page.getByRole("button", { name: /one-time|different address/i }).click();
  await openMap(page); await chooseCity(page, "1"); await review(page);
  await page.getByRole("button", { name: confirmLabel }).click();
  await expect(page.locator("#checkout-district")).toHaveValue("Map District");
  await expect(page.locator("input[name='checkout-saved-address']")).toBeChecked();
});

for (const [name, address, status] of [
  ["district-only", { country_code: "sa", city_district: "Test District" }, "Some details are missing"],
  ["street-only", { country_code: "sa", pedestrian: "Test Street", house_number: "12" }, "Some details are missing"],
  ["remote", { ...fixtures.Remote.address, state: "Riyadh Region" }, "No reliable Saudi address details"],
  ["outside", fixtures.Outside.address, "outside Saudi Arabia"],
  ["unknown", { road: "Unverified Road" }, "did not identify a reliable country"],
  ["conflict", { country_code: "sa", city: "Jeddah", state: "Makkah Region", road: "Wrong Road" }, "may not match your delivery city"],
] as const) {
  test(`${name}: accurate preview, safe confirmation and unchanged City ID`, async ({ page }, info) => {
    await setup(page);
    await page.route("https://eu1.locationiq.com/v1/reverse**", route => route.fulfill({ json: { address } }));
    await page.goto("/en/checkout"); await openMap(page); await chooseCity(page, "1");
    await page.getByRole("button", { name: reviewLabel }).click();
    await expect(page.getByRole("status").filter({ hasText: status })).toBeVisible();
    await expect(page.locator("#checkout-district")).toHaveValue("");
    if (name === "district-only") await page.screenshot({ path: info.outputPath("partial-preview.png") });
    if (["district-only", "street-only"].includes(name)) await page.getByRole("button", { name: confirmLabel }).click();
    else if (name === "remote") await page.getByRole("button", { name: "Continue with manual details" }).click();
    else { await expect(page.getByRole("button", { name: reviewLabel })).toBeDisabled(); await page.getByRole("button", { name: backLabel }).click(); }
    await expect(page.locator("#checkout-district")).toHaveValue(name === "district-only" ? "Test District" : "");
    await expect(page.locator("#checkout-street-details")).toHaveValue(name === "street-only" ? "12 Test Street" : "");
    await expect(page.locator("#checkout-city")).toHaveValue("1");
  });
}

for (const failure of ["ambiguous", "403", "429"]) {
  test(`city ${failure}: preserves city and allows manual map navigation`, async ({ page }, info) => {
    await setup(page);
    await page.route("https://eu1.locationiq.com/v1/search**", route => failure === "ambiguous"
      ? route.fulfill({ json: [...forward("Jeddah", "Makkah Region"), { ...forward("Jeddah", "Makkah Region")[0], lat: "21.6" }] })
      : route.fulfill({ status: Number(failure), json: { error: "unavailable" } }));
    await page.goto("/en/checkout"); await openMap(page); await chooseCity(page, "3");
    await expect(page.getByText(/could not confidently locate this city/)).toBeVisible();
    await expect(page.getByRole("button", { name: reviewLabel })).toBeEnabled();
    await expect(page.getByRole("combobox").last()).toHaveValue("3");
    if (failure === "403") await page.screenshot({ path: info.outputPath("provider-error.png") });
  });
}

test("late city/reverse responses cannot focus or confirm an old candidate", async ({ page }) => {
  await setup(page);
  let finish: (() => Promise<void>) | undefined;
  await page.route("https://eu1.locationiq.com/v1/search**", route => {
    const q = new URL(route.request().url()).searchParams;
    if (q.get("city") === "Riyadh") return new Promise<void>(resolve => { finish = async () => { await route.fulfill({ json: forward("Riyadh", "Riyadh Region") }).catch(() => {}); resolve(); }; });
    return route.fulfill({ json: forward(q.get("city")!, q.get("state")!) });
  });
  await page.goto("/en/checkout"); await openMap(page);
  await page.getByRole("dialog", { name: title }).getByRole("combobox").selectOption("1");
  await expect.poll(() => Boolean(finish)).toBe(true);
  await chooseCity(page, "3"); await finish!();
  await expect(page.getByRole("dialog", { name: title }).getByRole("combobox")).toHaveValue("3");
  let finishReverse: (() => Promise<void>) | undefined;
  await page.route("https://eu1.locationiq.com/v1/reverse**", route => new Promise<void>(resolve => { finishReverse = async () => { await route.fulfill({ json: fixtures.Jeddah }).catch(() => {}); resolve(); }; }));
  await page.getByRole("button", { name: reviewLabel }).click();
  await expect.poll(() => Boolean(finishReverse)).toBe(true);
  await chooseCity(page, "4"); await finishReverse!();
  await expect(page.getByRole("button", { name: confirmLabel })).toHaveCount(0);
  await page.getByRole("button", { name: backLabel }).click();
  await expect(page.locator("#checkout-district")).toHaveValue("");
});

test("tile failure and enlarged layout retain keyboard recovery", async ({ page }) => {
  await setup(page);
  await page.route("https://*-tiles.locationiq.com/**", route => route.abort());
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto("/en/checkout"); await openMap(page); await chooseCity(page, "1");
  await expect(page.getByRole("status").filter({ hasText: /Map tiles/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: backLabel }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: openLabel })).toBeFocused();
});

test("preview layout and orientation preserve the candidate under the pin", async ({ page }) => {
  const calls = await setup(page);
  await page.goto("/en/checkout"); await openMap(page); await chooseCity(page, "1"); await review(page);
  const candidate = calls.points.at(-1)!;
  await page.setViewportSize({ width: 720, height: 900 });
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.getByRole("button", { name: confirmLabel })).toBeEnabled();
  expect(calls.points.at(-1)![0]).toBeCloseTo(candidate[0], 3);
  expect(calls.points.at(-1)![1]).toBeCloseTo(candidate[1], 3);
});

test("mobile touch pan/pinch, reduced motion, error recovery and no overflow", async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  const calls = await setup(page);
  await page.goto("/en/checkout"); await openMap(page); await chooseCity(page, "1");
  await page.screenshot({ path: info.outputPath("mobile-picker.png") });
  const map = page.locator(".leaflet-container");
  const box = (await map.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 60, y: y + 30 }] });
  expect(calls.reverse).toBe(0);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByRole("button", { name: confirmLabel })).toBeEnabled();
  expect(Math.abs(calls.points.at(-1)![1] - 46.7)).toBeGreaterThan(.001);
  const beforeZoom = Math.max(...calls.zooms);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - 20, y }, { x: x + 20, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 65, y }, { x: x + 65, y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => Math.max(...calls.zooms)).toBeGreaterThan(beforeZoom);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.route("https://eu1.locationiq.com/v1/reverse**", route => route.fulfill({ status: 429, json: { error: "limited" } }));
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Address lookup failed" })).toBeVisible();
  await page.getByRole("button", { name: backLabel }).click();
  await page.locator("#checkout-district").fill("Manual");
  await expect(page.locator("#checkout-district")).toHaveValue("Manual");
  await context.close();
});
