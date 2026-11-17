import { useEffect, useMemo, useRef, useState } from "react";
import {
  MobileShell, MobileTopBar, MobileHero, MobileSection, MobileCard,
  MobileButton, MobileBadge,
} from "../mobile/MobileUi.jsx";
import { translate } from "../i18n/messages.js";
import {
  validateUsLocationCatalog, usLocationsForState,
  getUsBusinessDate, formatUsLocationAddress, formatUsPrice,
  isValidUsSlot, createUsBookingRequest, normalizeUsPhoneDraft,
} from "./usBookingModel.js";

const API_BASE = String(
  import.meta.env.VITE_API_BASE ||
  (typeof window !== "undefined" ? window.TOTEM_API_BASE : "") ||
  "https://api.totemv.com"
).replace(/\/$/, "");

const styles = {
  shell: { maxWidth: 780, margin: "0 auto", padding: "0 12px 48px" },
  stack: { display: "grid", gap: 16 },
  label: { display: "grid", gap: 7, fontWeight: 600, fontSize: 14 },
  control: {
    width: "100%", boxSizing: "border-box", minHeight: 44, padding: "10px 12px",
    border: "1px solid #CBD5E1", borderRadius: 11, fontSize: 16,
    background: "#fff", color: "#0F172A",
  },
  help: { fontSize: 13, color: "#475569", lineHeight: 1.55, margin: 0 },
  notice: {
    padding: 12, borderRadius: 12, background: "#FFF7ED",
    color: "#92400E", fontSize: 14, lineHeight: 1.5,
  },
  address: {
    padding: 13, borderRadius: 12, background: "#F1F5F9",
    color: "#334155", lineHeight: 1.55,
  },
};

function serviceRowsForMaster(services, masterId) {
  return services.filter(service =>
    Number(service.master_id) === Number(masterId) &&
    service.active !== false && service.currency_code === "USD" &&
    Number.isFinite(Number(service.duration_min)) && Number(service.duration_min) > 0
  );
}

async function requestJson(url, { signal, ...options } = {}) {
  const response = await fetch(url, {
    credentials: "omit",
    headers: { Accept: "application/json", ...options.headers },
    signal, ...options,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.ok !== true) {
    const error = new Error(payload?.error || "US_BOOKING_REQUEST_FAILED");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function getUsErrorMessage(tr, error) {
  const code = String(error?.message || "");
  if (code === "US_SLOT_UNAVAILABLE" || code === "TIME_SLOT_CONFLICT")
    return tr("us.book.conflict");
  if (code === "US_DST_GAP" || code === "US_DST_FOLD" ||
      code === "US_BOOKING_INSTANT_MISMATCH")
    return tr("us.book.timeError");
  if (code === "INVALID_US_PHONE" || code === "PHONE_REQUIRED" ||
      code === "US_BOOKING_FIELDS_INVALID")
    return tr("us.book.phoneError");
  if (code === "US_LOCATION_INACTIVE" || code === "MARKET_INACTIVE" ||
      code === "US_LOCATION_NOT_FOUND")
    return tr("us.book.locationInactive");
  return tr("us.book.generalError");
}

export default function UsBookingPage({ slug, salonName = "", marketContext }) {
  const tr = (key, params) => translate("en-US", key, params);
  const [catalog, setCatalog] = useState(null);
  const [masters, setMasters] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [masterId, setMasterId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [slotStartAt, setSlotStartAt] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [posting, setPosting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const submitLock = useRef(false);
  const retryKey = useRef(null);

  const verifiedMarket = marketContext?.market_code === "US" &&
    marketContext?.currency_code === "USD";
  const availableLocations = useMemo(
    () => usLocationsForState(catalog?.locations, stateCode),
    [catalog, stateCode]
  );
  const location = useMemo(
    () => availableLocations.find(item => item.location_code === locationCode) || null,
    [availableLocations, locationCode]
  );
  const filteredServices = useMemo(
    () => serviceRowsForMaster(services, masterId),
    [services, masterId]
  );
  const service = filteredServices.find(item => String(item.id) === serviceId) || null;
  const selectedSlot = slots.find(item => item.start_at === slotStartAt) || null;
  const minDate = useMemo(
    () => location ? getUsBusinessDate(new Date(), location.timezone) : "",
    [location]
  );

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    if (!verifiedMarket || !slug) {
      setLoading(false);
      setLoadError(tr("us.book.locationInactive"));
      return () => abort.abort();
    }

    setLoading(true);
    setLoadError("");
    const salonSlug = encodeURIComponent(slug);
    Promise.all([
      requestJson(`${API_BASE}/public/salons/${salonSlug}/us-locations`, {
        signal: abort.signal,
      }),
      requestJson(`${API_BASE}/public/salons/${salonSlug}/masters`, {
        signal: abort.signal,
      }),
      requestJson(`${API_BASE}/public/salons/${salonSlug}/services`, {
        signal: abort.signal,
      }),
    ]).then(([locationsPayload, mastersPayload, servicesPayload]) => {
      if (!active) return;
      const normalized = validateUsLocationCatalog(locationsPayload);
      const activeMasters = (mastersPayload.masters || []).filter(
        item => item.active !== false
      );
      setCatalog(normalized);
      setMasters(activeMasters);
      setServices(Array.isArray(servicesPayload.services) ? servicesPayload.services : []);
    }).catch(error => {
      if (!active || error?.name === "AbortError") return;
      setCatalog(null);
      setLoadError(getUsErrorMessage(tr, error));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; abort.abort(); };
  }, [slug, verifiedMarket]);

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    setSlots([]);
    setSlotStartAt("");
    setSlotError("");
    if (!location || !masterId || !service || !date) {
      setSlotLoading(false);
      return () => abort.abort();
    }
    setSlotLoading(true);
    const query = new URLSearchParams({
      service_id: String(service.id),
      date,
      location_code: location.location_code,
      step_min: "15",
    });
    requestJson(
      `${API_BASE}/public/salons/${encodeURIComponent(slug)}` +
      `/masters/${encodeURIComponent(masterId)}/availability?${query}`,
      { signal: abort.signal }
    ).then(payload => {
      if (!active) return;
      if (payload.location_code !== location.location_code ||
          payload.timezone !== location.timezone ||
          payload.date !== date) {
        throw new Error("US_SLOT_RESPONSE_MISMATCH");
      }
      const rows = Array.isArray(payload.slots) ? payload.slots : [];
      if (rows.some(row => !isValidUsSlot(row, location.location_code))) {
        throw new Error("US_SLOT_RESPONSE_INVALID");
      }
      setSlots(rows);
    }).catch(error => {
      if (!active || error?.name === "AbortError") return;
      setSlots([]);
      setSlotError(getUsErrorMessage(tr, error));
    }).finally(() => {
      if (active) setSlotLoading(false);
    });
    return () => { active = false; abort.abort(); };
  }, [slug, location, masterId, serviceId, date]);

  function chooseState(value) {
    setStateCode(value);
    setLocationCode("");
    setMasterId("");
    setServiceId("");
    setDate("");
    setSlotStartAt("");
    retryKey.current = null;
    setSubmitError("");
  }

  function chooseLocation(value) {
    setLocationCode(value);
    setMasterId("");
    setServiceId("");
    setDate("");
    setSlotStartAt("");
    retryKey.current = null;
    setSubmitError("");
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (posting || submitLock.current || !location || !selectedSlot || !service)
      return;
    let body;
    try {
      body = createUsBookingRequest({
        masterId, serviceId, location, date, slot: selectedSlot,
        clientName, clientPhone,
      });
    } catch (error) {
      setSubmitError(getUsErrorMessage(tr, error));
      return;
    }
    submitLock.current = true;
    setPosting(true);
    setSubmitError("");
    try {
      if (!retryKey.current) retryKey.current = crypto.randomUUID();
      const response = await requestJson(
        `${API_BASE}/public/salons/${encodeURIComponent(slug)}/bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "idempotency-key": retryKey.current,
          },
          body: JSON.stringify(body),
        }
      );
      if (!Number.isSafeInteger(Number(response.booking_id)) ||
          response.status !== "reserved" || !response.client_cabinet?.url) {
        throw new Error("US_BOOKING_RESPONSE_INVALID");
      }
      setConfirmation({
        id: Number(response.booking_id),
        date,
        slot: selectedSlot.local_time,
        location,
        master: masters.find(item => Number(item.id) === Number(masterId))?.name || "",
        service: service.name,
        // Catalog price is not the immutable booking price snapshot.
        price: null,
        cabinet: response.client_cabinet.url,
      });
      retryKey.current = null;
    } catch (error) {
      if (Number(error.status) >= 400 && Number(error.status) < 500) {
        retryKey.current = null;
      }
      setSubmitError(getUsErrorMessage(tr, error));
    } finally {
      submitLock.current = false;
      setPosting(false);
    }
  }

  if (!verifiedMarket || loading || loadError) {
    return (
      <MobileShell style={styles.shell}>
        <MobileTopBar title="TOTEM" subtitle={tr("us.book.title")} />
        <MobileSection title={tr("us.book.title")}>
          <MobileCard>
            <p role={loadError ? "alert" : "status"}>
              {loadError || (verifiedMarket ? tr("us.book.loading") : tr("us.book.locationInactive"))}
            </p>
          </MobileCard>
        </MobileSection>
      </MobileShell>
    );
  }

  if (confirmation) {
    return (
      <MobileShell style={styles.shell}>
        <MobileTopBar title="TOTEM" subtitle={tr("us.book.success")} />
        <MobileHero
          eyebrow="TOTEM"
          title={tr("us.book.success")}
          subtitle={tr("us.book.reserved")}
        />
        <MobileSection title={tr("us.book.confirmation")}>
          <MobileCard>
            <div style={styles.stack}>
              <MobileBadge tone="success">{tr("us.book.reserved")}</MobileBadge>
              <strong>{tr("us.book.bookingNumber", { number: confirmation.id })}</strong>
              <p>{confirmation.date} · {confirmation.slot} · {confirmation.location.timezone}</p>
              <p>{formatUsLocationAddress(confirmation.location)}</p>
              <p>{confirmation.master} · {confirmation.service}</p>
              <p>Verified USD price and payment recipient: see your client dashboard.</p>
              <a href={confirmation.cabinet}>{tr("us.book.clientCabinet")}</a>
              <p style={styles.help}>{tr("us.book.noOnlinePayment")}</p>
            </div>
          </MobileCard>
        </MobileSection>
      </MobileShell>
    );
  }

  return (
    <MobileShell style={styles.shell}>
      <MobileTopBar title="TOTEM" subtitle={tr("us.book.title")} />
      <MobileHero
        eyebrow="TOTEM · US"
        title={tr("us.book.title")}
        subtitle={tr("us.book.subtitle", { salon: salonName || slug })}
      />
      <MobileSection title={tr("us.book.details")}>
        <MobileCard>
          <form onSubmit={submitBooking} style={styles.stack} aria-label={tr("us.book.title")}>
            <label style={styles.label}>
              {tr("us.book.state")}
              <select
                style={styles.control}
                value={stateCode}
                onChange={e => chooseState(e.target.value)}
                required
                aria-label={tr("us.book.state")}
              >
                <option value="">{tr("us.book.statePlaceholder")}</option>
                {catalog?.states.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              {tr("us.book.location")}
              <select
                style={styles.control}
                value={locationCode}
                onChange={e => chooseLocation(e.target.value)}
                required
                disabled={!stateCode || availableLocations.length === 0}
                aria-label={tr("us.book.location")}
              >
                <option value="">{tr("us.book.locationPlaceholder")}</option>
                {availableLocations.map(item => (
                  <option key={item.location_code} value={item.location_code}>
                    {item.city_name} · {item.street_line1}
                  </option>
                ))}
              </select>
            </label>
            {stateCode && availableLocations.length === 0 && (
              <p style={styles.notice} role="status">{tr("us.book.noLocations")}</p>
            )}
            {location && (
              <div style={styles.address}>
                <strong>{tr("us.book.address")}</strong>
                <div>{formatUsLocationAddress(location)}</div>
                <div>{tr("us.book.timezone")}: {location.timezone}</div>
              </div>
            )}
            <label style={styles.label}>
              {tr("us.book.master")}
              <select
                style={styles.control}
                value={masterId}
                required
                disabled={!location}
                onChange={e => {
                  setMasterId(e.target.value);
                  setServiceId("");
                  setSlotStartAt("");
                  retryKey.current = null;
                }}
              >
                <option value="">{tr("us.book.chooseMaster")}</option>
                {masters.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              {tr("us.book.service")}
              <select
                style={styles.control}
                value={serviceId}
                required
                disabled={!masterId}
                onChange={e => {
                  setServiceId(e.target.value);
                  setSlotStartAt("");
                  retryKey.current = null;
                }}
              >
                <option value="">{tr("us.book.chooseService")}</option>
                {filteredServices.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {formatUsPrice(item.price)} · {item.duration_min} min
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.label}>
              {tr("us.book.date")}
              <input
                style={styles.control}
                type="date"
                value={date}
                required
                disabled={!location || !service}
                min={minDate}
                onChange={e => {
                  setDate(e.target.value);
                  setSlotStartAt("");
                  retryKey.current = null;
                }}
              />
            </label>
            <label style={styles.label}>
              {tr("us.book.time")}
              <select
                style={styles.control}
                value={slotStartAt}
                required
                disabled={!date || !service || slotLoading || slots.length === 0}
                onChange={e => { setSlotStartAt(e.target.value); retryKey.current = null; }}
              >
                <option value="">{tr("us.book.chooseTime")}</option>
                {slots.map(slot => (
                  <option key={slot.start_at} value={slot.start_at}>
                    {slot.local_time} ({location?.timezone})
                  </option>
                ))}
              </select>
            </label>
            {slotLoading && <p role="status">{tr("us.book.loadingTimes")}</p>}
            {slotError && <p role="alert" style={styles.notice}>{slotError}</p>}
            {date && !slotLoading && !slotError && slots.length === 0 && (
              <p role="status" style={styles.help}>{tr("us.book.noSlots")}</p>
            )}
            <label style={styles.label}>
              {tr("us.book.clientName")}
              <input
                style={styles.control}
                type="text"
                autoComplete="name"
                value={clientName}
                required
                minLength={2}
                maxLength={120}
                onChange={e => { setClientName(e.target.value); retryKey.current = null; }}
              />
            </label>
            <label style={styles.label}>
              {tr("us.book.clientPhone")}
              <input
                style={styles.control}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1 (213) 373-4253"
                value={clientPhone}
                required
                onChange={e => { setClientPhone(e.target.value); retryKey.current = null; }}
                onBlur={() => {
                  const normalized = normalizeUsPhoneDraft(clientPhone);
                  if (normalized) setClientPhone(normalized);
                }}
              />
            </label>
            <p style={styles.help}>{tr("us.book.phoneHelp")}</p>
            {service && (
              <div style={styles.address}>
                <strong>Estimated catalog price: {formatUsPrice(service.price)}</strong>
                <p style={styles.help}>Your final booking price is shown after server verification.</p>
                <p style={styles.help}>{tr("us.book.noOnlinePayment")}</p>
              </div>
            )}
            {submitError && <p role="alert" style={styles.notice}>{submitError}</p>}
            <MobileButton
              tone="primary"
              type="submit"
              disabled={!selectedSlot || !location || !service || posting}
            >
              {posting ? tr("us.book.submitting") : tr("us.book.confirm")}
            </MobileButton>
          </form>
        </MobileCard>
      </MobileSection>
    </MobileShell>
  );
}
