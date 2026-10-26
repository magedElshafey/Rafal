import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
function harness(fetch = async () => { throw new Error("Unexpected network"); }) {
  const modules = new Map();
  function load(name) {
    const file = path.join(root, name + ".ts");
    if (modules.has(file)) return modules.get(file).exports;
    const loadedModule = { exports: {} }; modules.set(file, loadedModule);
    vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      module: loadedModule, exports: loadedModule.exports, URL, Headers, FormData, AbortSignal, AbortController, DOMException,
      Error, TypeError, Date, setTimeout, clearTimeout, fetch,
      require: name => name.startsWith("@/") ? load("src/" + name.slice(2)) : name.startsWith(".") ? load(path.relative(root, path.resolve(path.dirname(file), name))) : require(name),
    });
    return loadedModule.exports;
  }
  return load;
}
const load = harness();
const { createAddressSuggestionGuard } = load("src/features/addresses/utils/merge-address-suggestion");
const { parseAddressSuggestion, createAddressLookup } = load("src/features/addresses/api/address-geocoding.client");
const { parseCityViewport, addressCityConflict, geographicName } = load("src/features/addresses/api/address-geocoding.client");
const plain = value => JSON.parse(JSON.stringify(value));
const empty = { district: "", streetDetails: "" };
const providerFixtures = JSON.parse(readFileSync("tests/fixtures/address-map-provider.json", "utf8"));

const cityResult = (city, region, lat = "24.7", lon = "46.7") => ({ class: "place", type: "city", lat, lon, boundingbox: ["24.5", "24.9", "46.5", "46.9"], address: { city, state: region, country_code: "sa" } });
for (const [name, region, lat, lon] of [["Riyadh", "Riyadh Region", "24.7", "46.7"], ["Jeddah", "Makkah Region", "21.5", "39.2"], ["Dammam", "Eastern Province", "26.4", "50.1"]]) {
  test(`${name}: forward city resolves only with matching Saudi administrative evidence`, () => {
    const city = { id: 42, name, regionName: region };
    const result = parseCityViewport([cityResult(name, region, lat, lon)], city);
    assert.deepEqual(plain(result.center), { lat: Number(lat), lng: Number(lon) });
    assert.equal(city.id, 42);
  });
}
test("city viewport rejects ambiguity, missing region, wrong country/name/region and invalid coordinates", () => {
  const city = { id: 1, name: "Riyadh", regionName: "Riyadh Region" };
  const row = cityResult(city.name, city.regionName);
  assert.equal(parseCityViewport([row], { ...city, regionName: undefined }), null);
  assert.equal(parseCityViewport([row, { ...row, lat: "24.8" }], city), null);
  assert.ok(parseCityViewport([row, row], city));
  assert.equal(parseCityViewport(Array(5).fill(row), city), null);
  for (const changed of [{ lat: "" }, { lon: "NaN" }, { lat: "40" }, { class: "highway", type: "residential" }, { address: { ...row.address, country_code: "ae" } }, { address: { ...row.address, state: "Other Region" } }, { address: { ...row.address, city: "Other City" } }]) {
    assert.equal(parseCityViewport([{ ...row, ...changed }], city), null);
  }
  assert.throws(() => parseCityViewport({}, city));
  assert.throws(() => parseCityViewport([null], city));
  assert.deepEqual(plain(parseCityViewport([row], city).bounds), [24.5, 46.5, 24.9, 46.9]);
  assert.equal(parseCityViewport([{ ...row, boundingbox: ["0", "90", "0", "180"] }], city).bounds, undefined);
});
test("duplicate city names use region evidence, never first-match selection", () => {
  const rows = [cityResult("Riyadh", "Other Region", "26", "44"), cityResult("Riyadh", "Riyadh Region")];
  assert.equal(parseCityViewport(rows, { id: 2, name: "Riyadh", regionName: "Other Region" }).center.lat, 26);
  assert.equal(parseCityViewport(rows, { id: 1, name: "Riyadh", regionName: "Riyadh Region" }).center.lat, 24.7);
});
test("confirmed geographic conflicts block suggestions; missing evidence does not invent a conflict", () => {
  const city = { id: 1, name: "Riyadh", regionName: "Riyadh Region" };
  assert.equal(addressCityConflict(city, { countryStatus: "saudi", city: "Jeddah" }), true);
  assert.equal(addressCityConflict(city, { countryStatus: "saudi", region: "Makkah Region" }), true);
  assert.equal(addressCityConflict(city, { countryStatus: "saudi", district: "District" }), false);
  assert.equal(addressCityConflict(city, { countryStatus: "saudi", city: "Riyadh", region: "Riyadh Province" }), false);
  assert.equal(geographicName("منطقة الرِّياض"), geographicName("الرياض"));
});
test("forward lookup uses city AND region, Saudi restriction, bounded neutral GET and no auth", async () => {
  let calls = 0;
  const resolve = harness(async (url, init) => {
    calls++;
    assert.equal(url.pathname, "/v1/search");
    assert.deepEqual(Object.fromEntries(url.searchParams), { key: "synthetic", city: "Riyadh", state: "Riyadh Region", countrycodes: "sa", format: "json", addressdetails: "1", limit: "5", "accept-language": "en" });
    assert.deepEqual([...init.headers], [["accept", "application/json"]]);
    assert.equal(init.body, undefined);
    return Response.json([cityResult("Riyadh", "Riyadh Region")]);
  })("src/features/addresses/api/address-geocoding.client").resolveCityViewport;
  const city = { id: 1, name: "Riyadh", regionName: "Riyadh Region" };
  assert.ok(await resolve(city, "en", "synthetic", new AbortController().signal));
  assert.equal(await resolve({ ...city, regionName: undefined }, "en", "synthetic", new AbortController().signal), null);
  assert.equal(calls, 1);
});

for (const city of ["Riyadh", "Jeddah", "Dammam"]) {
  test(`${city}: sanitized live-schema fixture populates both eligible fields`, () => {
    const suggestion = parseAddressSuggestion(providerFixtures[city]);
    assert.equal(suggestion.countryStatus, "saudi");
    assert.deepEqual(plain(createAddressSuggestionGuard(empty).merge(empty, suggestion)), {
      district: `Test ${city} District`, streetDetails: `Test ${city} Road`,
    });
  });
}

test("district/street fallbacks have deterministic precedence and never use broad geographic labels", () => {
  const parse = address => plain(parseAddressSuggestion({ address: { country_code: "sa", ...address } }));
  for (const key of ["suburb", "neighbourhood", "quarter", "city_district", "residential"]) {
    assert.deepEqual(parse({ [key]: "  Test   District  " }), { countryStatus: "saudi", district: "Test District" });
  }
  assert.equal(parse({ suburb: "First", neighbourhood: "Second", city_district: "Third" }).district, "First");
  for (const key of ["road", "pedestrian", "footway"]) {
    assert.deepEqual(parse({ [key]: "Test Road", house_number: "12" }), { countryStatus: "saudi", streetDetails: "12 Test Road" });
  }
  assert.equal(parse({ road: "Main Road", pedestrian: "Walk", footway: "Path" }).streetDetails, "Main Road");
  assert.equal(parse({ road: "12 Main Road", house_number: "12" }).streetDetails, "12 Main Road");
  assert.equal(parse({ road: "Road", house_number: 12 }).streetDetails, "Road");
  assert.equal(parse({ house_number: "12", province: "Province", country: "Saudi Arabia", display_name: "Full label" }).streetDetails, undefined);
  assert.equal(parse({ road: "Invalid\u0000Road", footway: "Path" }).streetDetails, "Path");
  assert.equal(parse({ road: "R".repeat(300), house_number: "12" }).streetDetails.length, 300);
});

test("remote, outside and missing country evidence remain distinct and never fabricate address fields", () => {
  const remote = parseAddressSuggestion(providerFixtures.Remote);
  assert.equal(remote.countryStatus, "saudi");
  assert.deepEqual(plain(createAddressSuggestionGuard(empty).merge(empty, remote)), {});
  assert.deepEqual(plain(parseAddressSuggestion(providerFixtures.Outside)), { countryStatus: "outside" });
  for (const value of [{}, { address: null }, { address: { road: "Road" } }, { address: { country_code: 1 } }]) {
    assert.deepEqual(plain(parseAddressSuggestion(value)), { countryStatus: "unknown" });
  }
  assert.equal(parseAddressSuggestion({ address: { country_code: " SA ", road: "Road" } }).streetDetails, "Road");
});

test("suggestions fill eligible text only; city and personal fields are never copied", () => {
  const guard = createAddressSuggestionGuard(empty);
  const patch = guard.merge(empty, { district: "District", streetDetails: "Road", city: "Riyadh", region: "Region", cityId: 999, lat: 1, phone: "secret" });
  assert.deepEqual(plain(patch), { district: "District", streetDetails: "Road" });
  assert.deepEqual(plain(guard.merge(patch, { district: "New" })), { district: "New" });
});

for (const field of ["district", "streetDetails"]) {
  test(`${field}: existing edit, manual changes, deliberate clearing and late responses are protected`, () => {
    const guard = createAddressSuggestionGuard({ ...empty, [field]: "Saved" });
    assert.deepEqual(plain(guard.merge({ ...empty, [field]: "Saved" }, { [field]: "Map" })), {});
    guard.manual(field);
    assert.deepEqual(plain(guard.merge(empty, { [field]: "Late" })), {});
    assert.deepEqual(plain(guard.merge(empty, { [field]: "Explicit" }, true)), { [field]: "Explicit" });
    guard.manual(field);
    assert.deepEqual(plain(guard.merge({ ...empty, [field]: "Edited" }, { [field]: "Later" })), {});
  });
}

test("unexpected current draft changes are protected even without a recorded manual event", () => {
  assert.deepEqual(plain(createAddressSuggestionGuard(empty).merge({ district: "Newer", streetDetails: "" }, { district: "Older" })), {});
});

test("partial, unsupported city and region conflicts cannot select a backend ID", () => {
  for (const suggestion of [{ district: "Only" }, { city: "Missing" }, { city: "Riyadh", region: "Conflicting" }, {}]) {
    const draft = { ...empty, city: { id: 42, name: "Riyadh" } };
    const next = { ...draft, ...createAddressSuggestionGuard(empty).merge(draft, suggestion) };
    assert.equal(next.city.id, 42);
    assert.equal("region" in next, false);
  }
});

test("duplicate city labels use region metadata while IDs and unrelated labels stay unchanged", () => {
  const { cityOptionLabel } = load("src/features/location/city-option-label");
  const cities = [{ id: 1, name: "الرياض", regionId: 1, regionName: "الأولى" }, { id: 2, name: "الرياض", regionId: 2, regionName: "الثانية" }];
  assert.equal(cityOptionLabel(cities[0], cities), "الرياض — الأولى");
  assert.equal(cityOptionLabel(cities[1], cities), "الرياض — الثانية");
  assert.equal(cityOptionLabel({ ...cities[0], regionName: undefined }, cities), "الرياض");
  assert.equal(cityOptionLabel(cities[0], [cities[0]]), "الرياض");
});

test("provider parsing accepts partial Saudi data without inventing streets/buildings", () => {
  assert.deepEqual(plain(parseAddressSuggestion({ address: { country_code: "sa", neighbourhood: " Area ", city: "City", state: "Region" } })), { countryStatus: "saudi", district: "Area", city: "City", region: "Region" });
  assert.deepEqual(plain(parseAddressSuggestion({ address: { country_code: "us", road: "Road" } })), { countryStatus: "outside" });
  assert.deepEqual(plain(parseAddressSuggestion({ address: { country_code: "sa", road: 12, suburb: "x".repeat(301) } })), { countryStatus: "saudi" });
  for (const value of [null, [], "body", { address: [] }]) assert.throws(() => parseAddressSuggestion(value));
});

test("reverse request uses bounded neutral transport, exact locale/coordinates, no customer/auth headers", async () => {
  let calls = 0;
  const load = harness(async (url, init) => {
    calls++;
    assert.equal(url.origin, "https://eu1.locationiq.com");
    assert.equal(url.pathname, "/v1/reverse");
    assert.deepEqual(Object.fromEntries(url.searchParams), { key: "synthetic", lat: "24", lon: "45", format: "json", addressdetails: "1", "accept-language": "ar" });
    for (const header of ["authorization", "x-cart-token", "cookie", "x-locale"]) assert.equal(init.headers.has(header), false);
    assert.equal(init.method, "GET");
    assert.deepEqual([...init.headers], [["accept", "application/json"]]);
    assert.equal(init.credentials, undefined);
    assert.equal(init.body, undefined);
    assert.ok(init.signal);
    return Response.json({ address: { country_code: "sa", road: "Road" } });
  });
  const { reverseGeocodeAddress } = load("src/features/addresses/api/address-geocoding.client");
  assert.equal((await reverseGeocodeAddress({ lat: 24, lng: 45 }, "ar", "synthetic", new AbortController().signal)).streetDetails, "Road");
  assert.equal(calls, 1);
});

for (const mode of ["429", "network", "json", "timeout", "abort"]) {
  test(`provider ${mode} fails without automatic retries`, async () => {
    let calls = 0;
    const load = harness(async () => {
      calls++;
      if (mode === "429") return Response.json({ message: "private" }, { status: 429 });
      if (mode === "json") return new Response("not json", { headers: { "Content-Type": "application/json" } });
      if (mode === "timeout" || mode === "abort") throw new DOMException("private", mode === "timeout" ? "TimeoutError" : "AbortError");
      throw new TypeError("private");
    });
    await assert.rejects(load("src/features/addresses/api/address-geocoding.client").reverseGeocodeAddress({ lat: 24, lng: 45 }, "en", "synthetic", new AbortController().signal));
    assert.equal(calls, 1);
  });
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
test("latest selection wins, duplicate selection is skipped, stale and canceled responses never apply", async () => {
  const calls = [], results = [], errors = [];
  const session = createAddressLookup((point, signal) => new Promise(resolve => calls.push({ point, signal, resolve })), value => results.push(value), () => errors.push(true));
  assert.equal(session.select({ lat: 24, lng: 45 }), true);
  assert.equal(session.select({ lat: 24, lng: 45 }), false);
  await sleep(400);
  session.select({ lat: 25, lng: 46 });
  assert.equal(calls[0].signal.aborted, true);
  calls[0].resolve({ district: "Stale" });
  await sleep(1100);
  calls[1].resolve({ district: "Latest" });
  await sleep(0);
  assert.deepEqual(results, [{ district: "Latest" }]);
  session.select({ lat: 26, lng: 47 }); session.cancel();
  await sleep(1100);
  assert.equal(calls.length, 2);
  assert.equal(errors.length, 0);
});

test("rapid movement coalesces into one confirmed lookup and errors allow deliberate retry", async () => {
  let calls = 0, failures = 0;
  const session = createAddressLookup(async () => { calls++; throw new Error(); }, () => assert.fail(), () => failures++);
  for (let i = 0; i < 5; i++) session.select({ lat: 24 + i, lng: 45 });
  await sleep(400);
  assert.equal(calls, 1); assert.equal(failures, 1);
  assert.equal(session.select({ lat: 28, lng: 45 }), true);
  session.cancel();
});

test("map fields cannot add coordinates to existing Address or Checkout serialization", () => {
  const { mapCreateAddressInput, mapUpdateAddressInput } = load("src/features/addresses/api/address-mapper");
  const { serializeCheckoutQuoteRequest } = load("src/features/checkout/api/checkout-serializer");
  const input = { label: "Home", recipientName: "Test", recipientPhone: "966501234567", cityId: 1, district: "District", streetDetails: "Street", isDefault: false };
  assert.deepEqual(plain(mapCreateAddressInput(input)), { label: "Home", recipient_name: "Test", recipient_phone: "966501234567", city_id: 1, district: "District", street_details: "Street", is_default: 0 });
  assert.deepEqual(plain(mapUpdateAddressInput({ district: "Changed" })), { district: "Changed" });
  assert.deepEqual(plain(serializeCheckoutQuoteRequest({ destination: { kind: "one-time-address", address: input }, shippingMethodId: 2 })), {
    city_id: "1", shipping_method_id: "2", "address[recipient_name]": "Test", "address[recipient_phone]": "966501234567", "address[city_id]": "1", "address[district]": "District", "address[street_details]": "Street",
  });
});
