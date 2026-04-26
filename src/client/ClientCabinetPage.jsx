import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = (
  import.meta.env.VITE_API_BASE ||
  window.TOTEM_API_BASE ||
  "https://api.totemv.com"
).replace(/\/$/, "");

function formatDateTime(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
}

function getBookingStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "reserved") return "Забронировано";
  if (normalized === "confirmed") return "Подтверждено";
  if (normalized === "completed") return "Завершено";
  if (normalized === "canceled" || normalized === "cancelled") return "Отменено";

  return status || "—";
}

function formatMoney(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "0 сом";
  }

  return `${amount.toLocaleString("ru-RU")} сом`;
}

function getSafeBookingList(data) {
  return Array.isArray(data?.bookings) ? data.bookings : [];
}

function getLatestBooking(data) {
  const bookings = getSafeBookingList(data);
  return bookings[0] || null;
}

export default function ClientCabinetPage() {
  const { clientId, token } = useParams();

  const [data, setData] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");

  const bookings = useMemo(() => getSafeBookingList(data), [data]);
  const latestBooking = useMemo(() => getLatestBooking(data), [data]);

  const personalLink = data?.personal_link || `#/client/${clientId}/${token}`;

  async function loadClientCabinet() {
    if (!clientId || !token) {
      setLoading(false);
      setError("Ссылка на кабинет неполная");
      return;
    }

    setLoading(true);
    setError("");
    setSaveError("");
    setSaveOk("");

    try {
      const response = await fetch(`${API_BASE}/public/clients/${clientId}/${token}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.ok !== true) {
        setError(payload?.error || "CLIENT_CABINET_LOAD_FAILED");
        setData(null);
        return;
      }

      setData(payload);
      setName(payload?.client?.name || "");
      setEmail(payload?.client?.email || "");
    } catch (err) {
      setError(err?.message || "CLIENT_CABINET_LOAD_FAILED");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClientCabinet();
  }, [clientId, token]);

  async function saveProfile(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setSaveError("");
    setSaveOk("");

    try {
      const response = await fetch(`${API_BASE}/public/clients/${clientId}/${token}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.ok !== true) {
        setSaveError(payload?.error || "CLIENT_PROFILE_UPDATE_FAILED");
        return;
      }

      setData((current) => ({
        ...(current || {}),
        client: payload.client || current?.client,
        personal_link: payload.personal_link || current?.personal_link
      }));

      setName(payload?.client?.name || "");
      setEmail(payload?.client?.email || "");
      setSaveOk("Данные сохранены");
    } catch (err) {
      setSaveError(err?.message || "CLIENT_PROFILE_UPDATE_FAILED");
    } finally {
      setSaving(false);
    }
  }

  async function copyPersonalLink() {
    setCopyStatus("");

    const absoluteLink = `${window.location.origin}${window.location.pathname}${personalLink}`;

    try {
      await window.navigator.clipboard.writeText(absoluteLink);
      setCopyStatus("Ссылка скопирована");
    } catch {
      setCopyStatus("Скопируйте ссылку вручную");
    }
  }

  function repeatBooking(booking) {
    if (!booking?.salon_slug) return;

    const params = new URLSearchParams();
    params.set("salon", booking.salon_slug);

    if (booking.master_id) {
      params.set("master", String(booking.master_id));
    }

    if (booking.service_id) {
      params.set("service", String(booking.service_id));
    }

    params.set("client", String(clientId || ""));

    if (token) {
      params.set("token", String(token));
    }

    window.location.hash = `#/booking?${params.toString()}`;
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.muted}>Загружаем кабинет клиента…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Кабинет клиента</h1>
          <p style={styles.error}>{error}</p>
          <button type="button" onClick={loadClientCabinet} style={styles.primaryButton}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>TOTEM</p>
          <h1 style={styles.title}>Кабинет клиента</h1>
          <p style={styles.muted}>
            Здесь хранится ваша запись, история посещений и личная ссылка на кабинет.
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Профиль</h2>

          <form onSubmit={saveProfile} style={styles.form}>
            <label style={styles.label}>
              Имя
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={styles.input}
                placeholder="Ваше имя"
              />
            </label>

            <label style={styles.label}>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={styles.input}
                placeholder="email@example.com"
              />
            </label>

            <label style={styles.label}>
              Телефон
              <input
                value={data?.client?.phone || ""}
                readOnly
                style={{
                  ...styles.input,
                  background: "#f3f4f6",
                  color: "#6b7280"
                }}
              />
              <span style={styles.hint}>Телефон в V1 нельзя менять из кабинета.</span>
            </label>

            {saveError ? <p style={styles.error}>{saveError}</p> : null}
            {saveOk ? <p style={styles.success}>{saveOk}</p> : null}

            <button type="submit" disabled={saving} style={styles.primaryButton}>
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
          </form>
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Личная ссылка</h2>
          <p style={styles.muted}>
            Сохраните ссылку. По ней можно вернуться в кабинет без пароля.
          </p>

          <div style={styles.linkBox}>{personalLink}</div>

          <button type="button" onClick={copyPersonalLink} style={styles.secondaryButton}>
            Скопировать ссылку
          </button>

          {copyStatus ? <p style={styles.success}>{copyStatus}</p> : null}
        </section>
      </div>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Текущая запись</h2>

        {latestBooking ? (
          <div style={styles.bookingCard}>
            <div>
              <strong>{latestBooking.service_name || "Услуга"}</strong>
              <p style={styles.muted}>{formatDateTime(latestBooking.start_at)}</p>
            </div>

            <div style={styles.bookingMeta}>
              <span style={styles.badge}>{getBookingStatusLabel(latestBooking.status)}</span>
              <span>{formatMoney(latestBooking.price_snapshot)}</span>
            </div>

            <div style={styles.bookingDetails}>
              <span>Мастер: {latestBooking.master_name || "—"}</span>
              <span>Салон: {latestBooking.salon_name || latestBooking.salon_slug || "—"}</span>
            </div>

            <button type="button" onClick={() => repeatBooking(latestBooking)} style={styles.secondaryButton}>
              Повторить запись
            </button>
          </div>
        ) : (
          <p style={styles.muted}>Записей пока нет.</p>
        )}
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>История записей</h2>

        {bookings.length ? (
          <div style={styles.list}>
            {bookings.map((booking) => (
              <div key={booking.id} style={styles.historyRow}>
                <div>
                  <strong>{booking.service_name || "Услуга"}</strong>
                  <p style={styles.muted}>{formatDateTime(booking.start_at)}</p>
                  <p style={styles.muted}>
                    {booking.master_name || "Мастер"} · {booking.salon_name || booking.salon_slug || "Салон"}
                  </p>
                </div>

                <div style={styles.historyRight}>
                  <span style={styles.badge}>{getBookingStatusLabel(booking.status)}</span>
                  <span>{formatMoney(booking.price_snapshot)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.muted}>История появится после первой записи.</p>
        )}
      </section>

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{data?.stats?.bookings_total || 0}</span>
          <span style={styles.statLabel}>Всего записей</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{data?.stats?.active_bookings || 0}</span>
          <span style={styles.statLabel}>Активные</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{data?.stats?.completed_bookings || 0}</span>
          <span style={styles.statLabel}>Завершённые</span>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    background: "#f8fafc",
    color: "#111827",
    fontFamily: "Inter, Arial, sans-serif"
  },
  header: {
    maxWidth: "1040px",
    margin: "0 auto 18px",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px"
  },
  eyebrow: {
    margin: "0 0 6px",
    color: "#6b7280",
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase"
  },
  title: {
    margin: 0,
    fontSize: "30px",
    lineHeight: 1.2
  },
  grid: {
    maxWidth: "1040px",
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px"
  },
  card: {
    maxWidth: "1040px",
    margin: "0 auto 18px",
    padding: "20px",
    borderRadius: "18px",
    background: "#ffffff",
    boxShadow: "0 12px 35px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb"
  },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: "20px"
  },
  muted: {
    margin: "4px 0",
    color: "#6b7280",
    lineHeight: 1.5
  },
  form: {
    display: "grid",
    gap: "12px"
  },
  label: {
    display: "grid",
    gap: "6px",
    fontWeight: 700
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    fontSize: "15px"
  },
  hint: {
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: 400
  },
  primaryButton: {
    border: 0,
    borderRadius: "12px",
    padding: "12px 16px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer"
  },
  secondaryButton: {
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "11px 15px",
    background: "#ffffff",
    color: "#111827",
    fontWeight: 800,
    cursor: "pointer"
  },
  error: {
    margin: "8px 0",
    color: "#b91c1c",
    fontWeight: 700
  },
  success: {
    margin: "8px 0",
    color: "#047857",
    fontWeight: 700
  },
  linkBox: {
    padding: "12px",
    margin: "12px 0",
    background: "#f3f4f6",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    wordBreak: "break-all",
    fontSize: "13px"
  },
  bookingCard: {
    display: "grid",
    gap: "12px"
  },
  bookingMeta: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap"
  },
  bookingDetails: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    color: "#374151"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: "13px",
    fontWeight: 800
  },
  list: {
    display: "grid",
    gap: "10px"
  },
  historyRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    background: "#ffffff"
  },
  historyRight: {
    display: "grid",
    justifyItems: "end",
    alignContent: "start",
    gap: "8px",
    whiteSpace: "nowrap"
  },
  statsGrid: {
    maxWidth: "1040px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px"
  },
  statCard: {
    padding: "18px",
    borderRadius: "16px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)"
  },
  statValue: {
    display: "block",
    fontSize: "28px",
    fontWeight: 900
  },
  statLabel: {
    color: "#6b7280",
    fontSize: "14px"
  }
};
