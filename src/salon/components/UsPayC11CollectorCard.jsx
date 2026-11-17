// US-PAY-C11: isolated recipient selection in US salon-owner bookings.
// Selection is NOT Stripe verification; payment controls remain absent.
import { useEffect, useState } from "react";
import { getUsOwnerCollector, chooseUsOwnerCollector } from "../usPayC11OwnerApi.js";

function exactUsd(price) {
  const minor = price?.amount_minor;
  if (price?.currency_code !== "USD" ||
      price?.source !== "us_booking_price_snapshots" ||
      typeof minor !== "string" || !/^[1-9]\d*$/.test(minor)) {
    return "Price unavailable";
  }
  const cents = BigInt(minor);
  if (cents > 99999999n) return "Price unavailable";
  const dollars = (cents / 100n).toLocaleString("en-US");
  return `$${dollars}.${String(cents % 100n).padStart(2,"0")}`;
}

export default function UsPayC11CollectorCard({
  bookingId, bookingStatus, salonName, masterName,
}) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [selection, setSelection] = useState("salon");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    setState({ loading: true, data: null, error: "" });
    setNotice("");
    setSelection("salon");

    getUsOwnerCollector(bookingId, { signal: abort.signal })
      .then(data => {
        if (!active) return;
        setState({ loading: false, data, error: "" });
        setSelection(data.collector?.collector_owner_type === "master" ? "master" : "salon");
      }).catch(error => {
        if (!active || abort.signal.aborted) return;
        setState({
          loading: false, data: null,
          error: String(error?.message || "US_OWNER_COLLECTOR_UNAVAILABLE"),
        });
      });
    return () => { active = false; abort.abort(); };
  }, [bookingId]);

  const record = state.data;
  const revision = Number(record?.collector?.revision || 0);
  const locked = record?.collector?.verification_status === "verified" ||
                 record?.collector?.verification_status === "revoked";
  const bookable = ["reserved", "confirmed"].includes(String(bookingStatus || "").toLowerCase());
  const maySave = !saving && !state.loading && !state.error && Boolean(record?.price) &&
                  !locked && bookable && Number.isSafeInteger(revision);

  async function submit(event) {
    event.preventDefault();
    if (!maySave) return;
    setSaving(true);
    setNotice("");
    try {
      const result = await chooseUsOwnerCollector(bookingId, selection, revision);
      setState({ loading: false, data: result, error: "" });
      setNotice("Recipient selection saved. Verification is pending; payments remain disabled.");
    } catch (error) {
      const code = String(error?.message || "US_OWNER_COLLECTOR_UNAVAILABLE");
      setNotice(code);
      if (error?.status === 409) {
        // A stale revision requires fresh owner-authorized state, not a blind retry.
        try {
          const refreshed = await getUsOwnerCollector(bookingId);
          setState({ loading: false, data: refreshed, error: "" });
          setSelection(refreshed.collector?.collector_owner_type === "master" ? "master" : "salon");
        } catch {
          setState({ loading: false, data: null, error: "US_OWNER_COLLECTOR_UNAVAILABLE" });
        }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="US payment recipient selection" style={{
      marginTop: 18, borderTop: "1px solid #e5e7eb", paddingTop: 16,
      display: "grid", gap: 10,
    }}>
      <h3 style={{ margin: 0, fontSize: 17 }}>US payment recipient</h3>
      {state.loading ? (
        <p role="status">Loading verified booking context…</p>
      ) : state.error ? (
        <p role="alert" style={{ color: "#b91c1c" }}>
          Recipient selection unavailable: {state.error}
        </p>
      ) : (
        <>
          <p style={{ margin: 0 }}>Immutable booking price: <strong>{exactUsd(record?.price)}</strong></p>
          <p style={{ margin: 0 }}>
            Current selection: <strong>{
              record?.collector?.collector_owner_type === "salon"
                ? (salonName || "Salon")
                : record?.collector?.collector_owner_type === "master"
                  ? (masterName || "Professional")
                  : "Not selected"
            }</strong>
          </p>
          <p style={{ margin: 0 }}>
            Recipient verification: <strong>{record?.collector?.verification_status || "not started"}</strong>
          </p>
          <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Choose who should collect payment
              <select
                aria-label="US payment recipient"
                value={selection}
                onChange={event => setSelection(event.target.value)}
                disabled={!maySave}
                style={{ minHeight: 44, border: "1px solid #d1d5db", borderRadius: 8, padding: 8 }}
              >
                <option value="salon">Salon — {salonName || "Salon"}</option>
                <option value="master">Professional — {masterName || "Professional"}</option>
              </select>
            </label>
            <button type="submit" disabled={!maySave} style={{
              minHeight: 44, border: 0, borderRadius: 8, fontWeight: 700,
              background: "#111827", color: "#fff", opacity: maySave ? 1 : 0.55,
              cursor: maySave ? "pointer" : "not-allowed",
            }}>
              {saving ? "Saving…" : "Save recipient selection"}
            </button>
          </form>
          <p role="note" style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            Selection is not a payment. Stripe verification and checkout are disabled.
          </p>
          {!bookable ? <p role="note">Recipient cannot be changed for this booking status.</p> : null}
          {locked ? <p role="note">Verified or revoked selections cannot be changed here.</p> : null}
          {notice ? <p role="status">{notice}</p> : null}
        </>
      )}
    </section>
  );
}
