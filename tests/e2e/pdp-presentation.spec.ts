import { test, expect, type Page } from "@playwright/test";

test.skip(process.env.PDP_PRESENTATION_E2E !== "1", "Requires the local-only PDP fixture opt-in.");
const widths = [[320, 700], [375, 812], [390, 844], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
async function setup(page: Page, cartMode = false) {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.context().addCookies([
    { name: "rafal_guest_city_id", value: "1", domain: "127.0.0.1", path: "/" },
    { name: "rafal_cart_token", value: cartMode ? "synthetic-pdp-cart" : "synthetic-cart", domain: "127.0.0.1", path: "/" },
  ]);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
for (const locale of ["ar", "en"]) {
  for (const [width, height] of [[320, 700], [390, 844], [768, 1024], [1280, 800], [1440, 900]]) {
    test(`${locale} final refinement ${width}x${height}`, async ({ page }, info) => {
      await setup(page, true);
      await page.setViewportSize({ width, height });
      for (const state of ["single-two", "personalized-three"]) {
        await page.goto(`/${locale}/products/pdp-refinement-${state}`);
        const main = page.locator('[data-pdp-purchase-surface="main"]');
        const controls = main.locator('[data-pdp-cart-controls]');
        if (state === "single-two") {
          await expect(controls).toBeVisible();
          const row = (await main.boundingBox())!, group = (await controls.boundingBox())!;
          const stepper = (await controls.locator(':scope > div').boundingBox())!;
          const output = (await controls.locator('output').boundingBox())!;
          expect(Math.abs(row.width - group.width)).toBeLessThan(2);
          expect(Math.abs(stepper.width + 44 + 12 - group.width)).toBeLessThan(2);
          expect(Math.abs(output.x + output.width / 2 - stepper.x - stepper.width / 2)).toBeLessThan(2);
          await expect(main.locator('[data-pdp-add]')).toBeHidden();
        } else {
          await expect(main.locator('[data-pdp-add]')).toBeDisabled();
          await page.locator('[data-product-page] input[required]').fill("Gift 123");
          await expect(main.locator('[data-pdp-add]')).toBeEnabled();
        }
        await main.scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath(`${state}-purchase.png`) });
        const logos = page.locator('[role="img"]:has(img[src*="tabby.svg"])');
        await logos.scrollIntoViewIfNeeded();
        for (const [index, expectedHeight] of [[0, 20], [1, 24]]) {
          expect((await logos.locator('img').nth(index).boundingBox())!.height).toBe(expectedHeight);
        }
        await logos.screenshot({ path: info.outputPath(`${state}-logos.png`) });
        const description = page.locator('section[aria-labelledby="product-description-title"]');
        const heading = (await description.locator('h2').boundingBox())!;
        const content = (await description.locator(':scope > div').boundingBox())!;
        expect(content.y).toBeGreaterThanOrEqual(heading.y + heading.height);
        expect(Math.abs(content.x - heading.x)).toBeLessThan(2);
        expect(Math.abs(content.width - heading.width)).toBeLessThan(2);
        await expect(description.locator('ul li')).toHaveCount(2);
        await description.screenshot({ path: info.outputPath(`${state}-description.png`) });
        await noOverflow(page);
        const related = page.locator('[aria-roledescription="carousel"]').last();
        await related.scrollIntoViewIfNeeded();
        await expect(related.locator('[aria-roledescription="slide"]')).toHaveCount(state === "single-two" ? 2 : 3);
        await page.screenshot({ path: info.outputPath(`${state}-related.png`) });
        if (state === "single-two") {
          const sticky = page.locator(`[data-pdp-purchase-surface="${width < 768 ? "mobile" : "desktop"}"]`);
          await expect(sticky).toHaveAttribute("aria-hidden", "false");
          expect((await sticky.locator('[data-pdp-cart-controls] > div').boundingBox())!.width).toBe(120);
        }
      }
    });
  }
  test(`${locale} empty recommendations leave no empty section`, async ({ page }) => {
    await setup(page);
    await page.goto(`/${locale}/products/pdp-refinement-empty`);
    await expect(page.locator('#product-title')).toBeVisible();
    await expect(page.getByRole('heading', { name: locale === "ar" ? "قد يعجبك أيضاً" : "You may also like" })).toHaveCount(0);
  });
  for (const [width, height] of widths) {
    test(`${locale} personalized layout ${width}x${height}`, async ({ page }, info) => {
      await setup(page);
      await page.setViewportSize({ width, height });
      await page.goto(`/${locale}/products/pdp-personalized`);
      const panel = page.locator('section[aria-labelledby="product-title"]');
      const gallery = page.locator('section:has(> button[data-gallery-control])');
      await expect(panel).toBeVisible();
      await expect(gallery.locator('img').first()).toBeVisible();
      await noOverflow(page);
      const p = (await panel.boundingBox())!, g = (await gallery.boundingBox())!;
      if (width < 1024) expect(g.y + g.height).toBeLessThanOrEqual(p.y);
      else {
        expect(Math.abs(p.y - g.y)).toBeLessThan(2);
        expect(Math.abs(p.width - g.width)).toBeLessThan(2);
        expect(locale === "ar" ? p.x > g.x : p.x < g.x).toBe(true);
      }
      const add = page.locator('[data-pdp-purchase-surface="main"] [data-pdp-add]');
      await expect(add).toBeDisabled();
      await panel.locator('input[required]').fill("هدية 🎁 123");
      await expect(add).toBeEnabled();
      await panel.locator('button[value="50"]').click();
      await expect(panel.locator('button[value="50"]')).toHaveAttribute("aria-pressed", "true");
      await expect(panel.locator('input[required]')).toHaveValue("هدية 🎁 123");
      await panel.locator('label:has(input[value="english"])').click();
      await expect(panel.locator('input[value="english"]')).toBeChecked();
      await expect(panel.locator('input[required]')).toHaveAttribute("dir", "ltr");
      await page.screenshot({ path: info.outputPath("configuration.png"), fullPage: true });
      // Exercise the existing observer through the purchase region, as scrolling does.
      await page.locator('[data-pdp-purchase-surface="main"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await page.locator('#reviews').evaluate(node => node.scrollIntoView({ block: "start" }));
      await expect(page.locator('section[aria-roledescription="carousel"][aria-label="' + (locale === "ar" ? "قد يعجبك أيضاً" : "You may also like") + '"]')).toBeVisible();
      await noOverflow(page);
      const sticky = page.locator(`[data-pdp-purchase-surface="${width < 768 ? "mobile" : "desktop"}"]`);
      await expect(sticky).toHaveAttribute("aria-hidden", "false");
      await page.screenshot({ path: info.outputPath("lower-and-sticky.png"), fullPage: true });
      const ids = await page.locator('[data-product-page] [id]').evaluateAll(nodes => nodes.map(n => n.id));
      expect(new Set(ids).size).toBe(ids.length);
    });
  }
  test(`${locale} gallery keyboard and lightbox focus restoration`, async ({ page }) => {
    await setup(page);
    await page.goto(`/${locale}/products/pdp-single`);
    const trigger = page.locator('button[data-gallery-control][aria-haspopup="dialog"]');
    await trigger.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
  });
  for (const state of ["single", "unavailable", "missing", "cart"]) {
    test(`${locale} ${state} purchase presentation`, async ({ page }, info) => {
      await setup(page, state === "cart");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${locale}/products/pdp-${state === "cart" ? "single" : state}`);
      const main = page.locator('[data-pdp-purchase-surface="main"]');
      if (state === "cart") await expect(main.locator('[data-pdp-cart-controls]')).toBeVisible();
      else if (state === "unavailable") await expect(main.locator('[data-pdp-add]')).toBeDisabled();
      else await expect(main.locator('[data-pdp-add]')).toBeEnabled();
      await expect(page.locator('[data-product-page] input[required]')).toHaveCount(0);
      await noOverflow(page);
      await main.scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath("state.png"), fullPage: true });
    });
  }
  test(`${locale} short mobile viewport keeps personalization reachable`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width: 390, height: 400 });
    await page.goto(`/${locale}/products/pdp-personalized`);
    const input = page.locator('[data-product-page] input[required]');
    await page.locator('label:has(input[value="english"])').click();
    await page.keyboard.press("Tab");
    await expect(input).toBeFocused();
    await page.keyboard.type("Gift 123");
    const box = (await input.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(400);
    expect(await input.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === node;
    })).toBe(true);
    await noOverflow(page);
  });
}
