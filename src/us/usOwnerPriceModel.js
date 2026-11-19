// A US service price is a versioned USD *minor-unit* value.
// Never infer it from the legacy salon/master service.price integer.
export const MAX_US_PRICE_MINOR = 99_999_999;

export function parseUsdMinor(text) {
  if (typeof text !== "string") return null;
  const input = text.trim().replace(",", ".");
  if (!/^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,2})?$/.test(input)) return null;

  const [dollars, cents = ""] = input.split(".");
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  return Number.isSafeInteger(amount) &&
    amount >= 1 && amount <= MAX_US_PRICE_MINOR ? amount : null;
}

export function priceMinorToInput(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_US_PRICE_MINOR) {
    throw new Error("US_PRICE_MINOR_INVALID");
  }
  return (value / 100).toFixed(2);
}

export function formatUsdMinor(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_US_PRICE_MINOR) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function assertUsPriceIdentity(ownerType, ownerSlug, serviceLinkId) {
  if (!["salon", "master"].includes(ownerType) ||
      typeof ownerSlug !== "string" ||
      !/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/.test(ownerSlug) ||
      !Number.isSafeInteger(Number(serviceLinkId)) ||
      Number(serviceLinkId) < 1 ||
      !/^[1-9][0-9]*$/.test(String(serviceLinkId))) {
    throw new Error("US_PRICE_TARGET_INVALID");
  }
  return {
    ownerType, ownerSlug,
    serviceLinkId: Number(serviceLinkId),
  };
}

export function parseUsPriceResponse(data, ownerType, ownerSlug, serviceLinkId) {
  const target = assertUsPriceIdentity(ownerType, ownerSlug, serviceLinkId);
  if (!data || data.ok !== true ||
      data.owner_type !== target.ownerType ||
      data.owner_slug !== target.ownerSlug ||
      Number(data.salon_master_service_id) !== target.serviceLinkId ||
      data.market_code !== "US" ||
      data.currency_code !== "USD" ||
      data.payment_purpose !== "beauty_service" ||
      data.source !== "us_service_price_amounts" ||
      !Number.isSafeInteger(Number(data.market_id)) ||
      Number(data.market_id) < 1 ||
      typeof data.configured !== "boolean" ||
      !Number.isSafeInteger(data.price_version) || data.price_version < 0) {
    throw new Error("US_PRICE_READBACK_CONTRACT_MISMATCH");
  }

  const value = data.amount_minor;
  if (!data.configured) {
    if (value !== null || data.price_version !== 0) {
      throw new Error("US_PRICE_READBACK_CONTRACT_MISMATCH");
    }
    return { configured: false, amount_minor: null,
      price_version: 0, market_id: Number(data.market_id) };
  }

  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) {
    throw new Error("US_PRICE_READBACK_CONTRACT_MISMATCH");
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount > MAX_US_PRICE_MINOR) {
    throw new Error("US_PRICE_READBACK_CONTRACT_MISMATCH");
  }
  return { configured: true, amount_minor: amount,
    price_version: data.price_version, market_id: Number(data.market_id) };
}

export function assertUsPriceReadback(before, written, after, desiredAmount) {
  if (!before || !written || !after ||
      !written.configured || !after.configured ||
      written.amount_minor !== desiredAmount ||
      after.amount_minor !== desiredAmount ||
      written.market_id !== before.market_id ||
      after.market_id !== before.market_id ||
      written.price_version <= before.price_version ||
      after.price_version !== written.price_version) {
    throw new Error("US_PRICE_WRITE_READBACK_FAILED");
  }
  return true;
}
