// US-PAY-C11-SDK: US-only, fail-closed presentation of verified API data.
// USD values are integer minor units, NEVER legacy bookings.price_snapshot.
const STATUSES = Object.freeze({
  reserved: "Reserved",
  confirmed: "Confirmed",
  completed: "Completed",
  canceled: "Canceled",
  cancelled: "Canceled",
});
const PAYMENT_STATUSES = new Set([
  "unpaid", "awaiting_payment", "paid", "partially_refunded", "refunded", "disputed", "requires_review",
]);
const MAX_US_CENTS = 99999999n;

function safeId(value) {
  const raw = String(value ?? "");
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const numeric = Number(raw);
  return Number.isSafeInteger(numeric) ? numeric : null;
}

export function isUsPayC11Booking(booking) {
  return String(booking?.market_code || "").toUpperCase() === "US";
}

// Returns null unless the response belongs to THIS US booking and contract.
// Unknown financial fields must never be sourced from catalog/legacy payments.
export function normalizeUsPayC11Response(payload, bookingId) {
  const expected = safeId(bookingId);
  if (!expected || !payload || payload.ok !== true ||
      payload.contract_version !== "US-PAY-C11-read-v1" ||
      payload.market_code !== "US" || payload.currency_code !== "USD" ||
      safeId(payload.booking_id) !== expected ||
      payload.payment_ready !== false) {
    return null;
  }

  const rawStatus = String(payload.booking_status || "").toLowerCase();
  const bookingStatus = Object.hasOwn(STATUSES, rawStatus)
    ? rawStatus : "unavailable";

  let price = null;
  const rawPrice = payload.price;
  if (rawPrice?.currency_code === "USD" &&
      rawPrice?.source === "us_booking_price_snapshots" &&
      typeof rawPrice?.amount_minor === "string" &&
      /^[1-9]\d*$/.test(rawPrice.amount_minor)) {
    const cents = BigInt(rawPrice.amount_minor);
    if (cents > 0n && cents <= MAX_US_CENTS) {
      price = Object.freeze({
        amount_minor: cents.toString(),
        currency_code: "USD",
        source: "us_booking_price_snapshots",
      });
    }
  }

  let collector = null;
  const rawCollector = payload.collector;
  if (rawCollector?.verified === true &&
      (rawCollector.owner_type === "salon" || rawCollector.owner_type === "master") &&
      typeof rawCollector.display_name === "string" &&
      rawCollector.display_name.trim()) {
    collector = Object.freeze({
      owner_type: rawCollector.owner_type,
      display_name: rawCollector.display_name.trim(),
      verified: true,
    });
  }

  const paymentStatus = String(payload.payment?.service_payment_status || "")
    .toLowerCase();
  const provider = payload.payment?.provider;
  // A non-Stripe/legacy status cannot ever assert "paid" for a US booking.
  const safePaymentStatus = PAYMENT_STATUSES.has(paymentStatus) &&
    (provider === "stripe" || (provider === null && paymentStatus === "requires_review"))
    ? paymentStatus : "requires_review";

  return Object.freeze({
    ok: true,
    contract_version: "US-PAY-C11-read-v1",
    booking_id: expected,
    market_code: "US",
    currency_code: "USD",
    booking_status: bookingStatus,
    price,
    collector,
    payment: Object.freeze({
      service_payment_status: safePaymentStatus,
      provider: provider === "stripe" ? "stripe" : null,
    }),
    payment_ready: false,
  });
}

export function getUsPayC11Detail(booking) {
  if (!isUsPayC11Booking(booking)) return null;
  return normalizeUsPayC11Response(booking?.us_pay_c11, booking?.id);
}

export function formatUsPayC11Amount(booking) {
  const price = getUsPayC11Detail(booking)?.price;
  if (!price) return "Price unavailable";
  const cents = BigInt(price.amount_minor);
  const dollars = (cents / 100n).toLocaleString("en-US");
  const fractional = String(cents % 100n).padStart(2, "0");
  return `$${dollars}.${fractional}`;
}

export function formatUsPayC11Status(booking) {
  const raw = getUsPayC11Detail(booking)?.booking_status;
  return Object.hasOwn(STATUSES, raw) ? STATUSES[raw] : "Status unavailable";
}

export function formatUsPayC11Recipient(booking) {
  const collector = getUsPayC11Detail(booking)?.collector;
  if (!collector) return "Payment recipient unavailable";
  const ownerType = collector.owner_type === "salon" ? "Salon" : "Professional";
  return `Payment recipient: ${ownerType} — ${collector.display_name}`;
}

export function formatUsPayC11PaymentStatus(booking) {
  const status = getUsPayC11Detail(booking)?.payment.service_payment_status;
  const labels = {
    unpaid: "Payment not received",
    awaiting_payment: "Awaiting payment",
    paid: "Payment received",
    partially_refunded: "Payment partially refunded",
    refunded: "Payment refunded",
    disputed: "Payment disputed",
  };
  return Object.hasOwn(labels, status) ? labels[status] : "Payment status unavailable";
}
