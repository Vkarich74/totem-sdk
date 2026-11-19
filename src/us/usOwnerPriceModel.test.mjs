import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_US_PRICE_MINOR, parseUsdMinor, priceMinorToInput,
  formatUsdMinor, assertUsPriceIdentity, parseUsPriceResponse,
  assertUsPriceReadback,
} from "./usOwnerPriceModel.js";

const owner = ["salon", "existing-us-salon", 701];
function response(overrides = {}) {
  return {
    ok: true, owner_type: owner[0], owner_slug: owner[1],
    salon_master_service_id: owner[2], market_id: 2,
    market_code: "US", currency_code: "USD",
    payment_purpose: "beauty_service", source: "us_service_price_amounts",
    amount_minor: "15025", price_version: 2, configured: true,
    ...overrides,
  };
}
test("USD decimal is converted exactly to cents without floating-point money", () => {
  for (const [text, minor] of [
    ["0.01", 1], ["1", 100], ["1.2", 120],
    ["75,95", 7595], ["999999.99", MAX_US_PRICE_MINOR],
    [" 150.25 ", 15025],
  ]) {
    assert.equal(parseUsdMinor(text), minor);
    assert.equal(parseUsdMinor(priceMinorToInput(minor)), minor);
  }
  assert.equal(formatUsdMinor(15025), "$150.25");
});
test("non-dollar, invalid and 0-cent inputs are rejected", () => {
  for (const value of [
    "", "0", "0.00", "0.001", "1.234", "-1", "1e3", "NaN",
    "999999.999", "1000000.00", "1 500", "$12.00", "12.0.1", "١٢",
  ]) assert.equal(parseUsdMinor(value), null, value);
  assert.equal(parseUsdMinor(12.50), null);
  assert.throws(() => priceMinorToInput(0), /US_PRICE_MINOR_INVALID/);
});
test("target must name actual owner type, slug and integer service link", () => {
  assert.deepEqual(assertUsPriceIdentity(...owner), {
    ownerType: "salon", ownerSlug: "existing-us-salon", serviceLinkId: 701,
  });
  for (const input of [
    ["client", owner[1], 701], ["salon", "../admin", 701],
    ["master", "", 701], ["salon", "x", 0],
    ["master", "x", "12.3"], ["salon", "x", "-2"],
  ]) assert.throws(() => assertUsPriceIdentity(...input),
    /US_PRICE_TARGET_INVALID/);
});
test("price GET/PUT readback only accepts exact US/USD/link/owner contract", () => {
  const parsed = parseUsPriceResponse(response(), ...owner);
  assert.deepEqual(parsed, {
    configured: true, amount_minor: 15025, price_version: 2, market_id: 2,
  });
  assert.deepEqual(parseUsPriceResponse(response({
    amount_minor: null, configured: false, price_version: 0,
  }), ...owner), {
    configured: false, amount_minor: null, price_version: 0, market_id: 2,
  });
  for (const bad of [
    { market_code: "KG" }, { currency_code: "KGS" },
    { owner_slug: "other" }, { owner_type: "master" },
    { salon_master_service_id: 999 }, { market_id: null },
    { source: "salon_master_services" }, { configured: true, amount_minor: null },
    { configured: false, amount_minor: "0" }, { price_version: -1 },
    { amount_minor: 15025 }, { amount_minor: "0" },
  ]) assert.throws(
    () => parseUsPriceResponse(response(bad), ...owner),
    /US_PRICE_READBACK_CONTRACT_MISMATCH/,
    JSON.stringify(bad)
  );
});
test("a write needs server version advance and independent GET readback", () => {
  const before = parseUsPriceResponse(response({
    amount_minor: null, price_version: 0, configured: false,
  }), ...owner);
  const written = parseUsPriceResponse(response({
    amount_minor: "2599", price_version: 1, configured: true,
  }), ...owner);
  const after = parseUsPriceResponse(response({
    amount_minor: "2599", price_version: 1, configured: true,
  }), ...owner);
  assert.equal(assertUsPriceReadback(before, written, after, 2599), true);
  assert.throws(
    () => assertUsPriceReadback(before, written, after, 2598),
    /US_PRICE_WRITE_READBACK_FAILED/
  );
  assert.throws(
    () => assertUsPriceReadback(before, written, { ...after, price_version: 2 }, 2599),
    /US_PRICE_WRITE_READBACK_FAILED/
  );
});
test("no backend, database or new salon fixture is needed", () => {
  assert.equal(typeof globalThis.window, "undefined");
});
