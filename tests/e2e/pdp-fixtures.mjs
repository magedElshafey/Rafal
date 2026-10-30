// Synthetic presentation fixtures only. Never contact Laravel or accept mutations.
import { readFileSync } from "node:fs";

const original = JSON.parse(readFileSync(new URL("../fixtures/product-33.json", import.meta.url), "utf8")).data;
const meta = total => ({ current_page: 1, last_page: 1, per_page: 15, total });
export function pdpFixtureResponse(req, url, cart) {
  const ar = req.headers["accept-language"]?.startsWith("ar");
  const ok = data => ({ success: true, message: "Synthetic PDP fixture", data });
  if (url.pathname === "/locations/resolve") return ok({ city: { id: 1, name: ar ? "الرياض" : "Riyadh" }, region: { id: 10, name: "Riyadh" }, in_coverage: true, message: null, warehouse_id: 7 });
  if (req.method !== "GET") return null;
  const match = url.pathname.match(/^\/products\/(pdp-[\w-]+)(\/related)?$/);
  const makeProduct = (slug, id = 33) => {
    const product = structuredClone(original);
    Object.assign(product, {
      id, slug, name: ar ? "قلادة ذهبية بتفاصيل أنيقة لهدية تحمل معنى" : "A golden necklace with thoughtful details for a meaningful gift",
      description: ar ? "<p>تصميم أنيق بتفاصيل ناعمة، مناسب للإطلالات اليومية والهدايا.</p><p>اختاري المقاس المناسب وأضيفي لمستك الشخصية.</p>" : "<p>An elegant design with considered details for everyday wear and thoughtful gifting.</p><p>Choose your size and add your personal touch.</p>",
      images: slug.includes("missing") ? [] : ["/images/home/name-necklace.png", "/images/home/heart-necklace.png"],
      is_personalizable: slug.includes("personalized"), personalization_max_length: 15, personalization_fee: "10.00",
      rating_average: 4.5, reviews_count: 3, viewers_now: 12, times_ordered: 140,
      category: { id: 5, name: ar ? "هدايا" : "Gifts", slug: "gifts" },
    });
    product.variants = [structuredClone(original.variants[0])];
    if (slug.includes("refinement")) product.description = `<p>${(ar ? "تفاصيل هدية أنيقة مع خيارات متعددة ولمسة شخصية تناسب مختلف المناسبات. " : "A thoughtful gift with considered details, versatile choices and a personal touch for different occasions. ").repeat(12)}</p><ul><li>${ar ? "تفاصيل المنتج" : "Product details"}</li><li><strong>${ar ? "العناية بالمنتج" : "Product care"}</strong></li></ul>`;
    product.variants[0].attributes = { size: "30" };
    if (!slug.includes("single")) product.variants.push({ ...structuredClone(product.variants[0]), id: 55, sku: "SYNTHETIC-50", attributes: { size: "50" }, effective_price: "120.00", effective_price_incl_vat: "138.00" });
    if (slug.includes("unavailable")) for (const variant of product.variants) variant.warehouse_stocks = [{ warehouse_id: 7, quantity: 0 }];
    return product;
  };
  if (match) {
    if (match[2]) {
      const count = match[1].endsWith("empty") ? 0 : match[1].endsWith("two") ? 2 : match[1].endsWith("three") ? 3 : 8;
      return { ...ok(Array.from({ length: count }, (_, i) => makeProduct(`pdp-related-${i}`, i + 100))), meta: meta(count) };
    }
    return ok(makeProduct(match[1]));
  }
  if (url.pathname === "/products/33/reviews") return { ...ok({
    summary: { average: 4.5, count: 3, breakdown: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 2 } },
    reviews: Array.from({ length: 3 }, (_, i) => ({ id: i + 1, rating: i === 0 ? 4 : 5, reviewer_display_name: ar ? "عميل رافال مع اسم طويل لاختبار التفاف النص" : "Rafal customer with a long reviewer display name", comment: (ar ? "تفاصيل جميلة وتجربة اختيار واضحة. هدية أنيقة ومميزة. " : "Beautiful details and a clear selection experience. A thoughtful gift. ").repeat(i + 1), admin_response: i === 0 ? (ar ? "شكراً لمشاركتنا تجربتك." : "Thank you for sharing your experience.") : null, helpful_count: 0, photos: [], created_at: "2026-09-23T17:53:47+00:00" })),
  }), meta: meta(3) };
  if (url.pathname === "/cart" && req.headers["x-cart-token"] === "synthetic-pdp-cart") {
    const result = structuredClone(cart);
    result.token = "synthetic-pdp-cart";
    Object.assign(result.items[0].product, { id: 33, slug: "pdp-single", personalizable: false });
    Object.assign(result.items[0].variant, { id: 54, attributes: { size: "30" } });
    return ok(result);
  }
  return null;
}
