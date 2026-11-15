import { NotificationText, NotificationLabel } from "../i18n/NotificationText.jsx";
import { useMarketContext } from "../market/MarketContext.jsx";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getClientNotifications, markClientNotificationRead } from "../api/client.js";
import { postMobileEvent } from "../api/publicApi.js";
import { stageLinkPolicy } from "../staging/stageLinkRuntime.js";
import ClientPushOptInCard from "../components/ClientPushOptInCard.jsx";
import {
  clientCabinetLabels, isUsClientDashboard, formatClientBookingTime,
  formatClientBookingMoney, clientBookingStatusLabel,
  clientBookingPaymentLabel,
} from "./clientCabinetPresentation.js";

const API_BASE = (
  import.meta.env.VITE_API_BASE ||
  window.TOTEM_API_BASE ||
  "https://api.totemv.com"
).replace(/\/$/, "");

function getSafeBookingList(data) {
  return Array.isArray(data?.bookings) ? data.bookings : [];
}

function getSafeNotificationList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function getNotificationUid(notification) {
  return String(notification?.notification_uid || notification?.uid || "").trim();
}

function getUnreadNotificationCount(items) {
  return getSafeNotificationList(items).reduce((count, item) => {
    return count + (item?.read_at || item?.is_read ? 0 : 1);
  }, 0);
}

function getResolvedUnreadCount(payload, items) {
  const apiUnreadCount = Number(payload?.unread_count);

  if (Number.isFinite(apiUnreadCount) && apiUnreadCount >= 0) {
    return apiUnreadCount;
  }

  return getUnreadNotificationCount(items);
}

function getLatestBooking(data) {
  const bookings = getSafeBookingList(data);
  return bookings[0] || null;
}

function getPageStyle(isMobile) {
  return {
    minHeight: "100vh",
    padding: isMobile ? "12px 8px 20px" : "24px",
    background: "#f8fafc",
    color: "#111827",
    fontFamily: "Inter, Arial, sans-serif"
  };
}

function getHeaderStyle(isMobile) {
  return {
    maxWidth: "1040px",
    margin: isMobile ? "0 auto 12px" : "0 auto 18px",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px"
  };
}

function getTitleStyle(isMobile) {
  return {
    margin: 0,
    fontSize: isMobile ? "26px" : "30px",
    lineHeight: 1.2
  };
}

function getCardStyle(isMobile) {
  return isMobile
    ? {
        maxWidth: "1040px",
        margin: "0 auto 18px",
        padding: "16px",
        borderRadius: "16px",
        background: "#ffffff",
        boxShadow: "0 12px 35px rgba(15, 23, 42, 0.08)",
        border: "1px solid #e5e7eb"
      }
    : {
        maxWidth: "1040px",
        margin: "0 auto 18px",
        padding: "20px",
        borderRadius: "18px",
        background: "#ffffff",
        boxShadow: "0 12px 35px rgba(15, 23, 42, 0.08)",
        border: "1px solid #e5e7eb"
      };
}

function getHistoryRowStyle(isMobile) {
  return isMobile
    ? {
        display: "grid",
        gap: "12px",
        padding: "14px",
        borderRadius: "14px",
        border: "1px solid #e5e7eb",
        background: "#ffffff"
      }
    : {
        display: "flex",
        justifyContent: "space-between",
        gap: "14px",
        padding: "14px",
        borderRadius: "14px",
        border: "1px solid #e5e7eb",
        background: "#ffffff"
      };
}

function getHistoryRightStyle(isMobile) {
  return isMobile
    ? {
        display: "grid",
        justifyItems: "start",
        alignContent: "start",
        gap: "8px",
        whiteSpace: "normal"
      }
    : {
        display: "grid",
        justifyItems: "end",
        alignContent: "start",
        gap: "8px",
        whiteSpace: "nowrap"
      };
}

function getActionButtonStyle(baseStyle, isMobile) {
  return {
    ...baseStyle,
    ...(isMobile
      ? {
          width: "100%",
          minHeight: 48
        }
      : null)
  };
}

function getActionLinkStyle(baseStyle, isMobile) {
  return {
    ...baseStyle,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    ...(isMobile
      ? {
          width: "100%",
          minHeight: 48
        }
      : null)
  };
}

export default function ClientCabinetPage() {
  const { t, formatDateTime: localeDate } = useMarketContext();
  const { clientId, token } = useParams();

  const [data, setData] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [readingNotificationUid, setReadingNotificationUid] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  // Region is from the authorized client API, not inferred from browser locale.
  const copy = clientCabinetLabels(data);
  const usClient = isUsClientDashboard(data);
  const notificationCopy = {
    header: usClient ? copy.notifications : t("notifications.header"),
    loading: usClient ? copy.notificationsLoading : t("notifications.loading"),
    error: usClient ? copy.notificationsError : t("notifications.loadError"),
    empty: usClient ? copy.notificationsEmpty : t("notifications.empty"),
    new: usClient ? copy.notificationsNew : t("notifications.new"),
    read: usClient ? copy.notificationsRead : t("notifications.read"),
    open: usClient ? copy.notificationsOpen : t("notifications.open"),
  };
  const bookings = useMemo(() => getSafeBookingList(data), [data]);
  const latestBooking = useMemo(() => getLatestBooking(data), [data]);
  const notificationItems = useMemo(() => getSafeNotificationList(notifications), [notifications]);

  const personalLink = data?.personal_link || `#/client/${clientId}/${token}`;

  async function loadClientCabinet() {
    if (!clientId || !token) {
      setLoading(false);
      setError(copy.incompleteLink);
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

  async function loadClientNotifications() {
    if (!clientId || !token) {
      setUnreadCount(0);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      const payload = await getClientNotifications(clientId, token, { limit: 20 });
      const items = getSafeNotificationList(payload);
      setNotifications(items);
      setUnreadCount(getResolvedUnreadCount(payload, items));
    } catch (err) {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsError(err?.message || "CLIENT_NOTIFICATIONS_FETCH_FAILED");
    } finally {
      setNotificationsLoading(false);
    }
  }

  useEffect(() => {
    loadClientCabinet();
    loadClientNotifications();
  }, [clientId, token]);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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
      setSaveOk(copy.saved);
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
      setCopyStatus(copy.copied);
    } catch {
      setCopyStatus(copy.copyManual);
    }
  }

  async function readNotification(notification) {
    if (readingNotificationUid) return;

    const notificationUid = getNotificationUid(notification);
    if (!notificationUid) {
      return;
    }

    setReadingNotificationUid(notificationUid);

    try {
      await markClientNotificationRead(clientId, token, notificationUid);
      if (!notification?.read_at && !notification?.is_read) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      setNotifications((current) =>
        getSafeNotificationList(current).map((item) => {
          const currentUid = getNotificationUid(item);
          if (currentUid !== notificationUid) {
            return item;
          }

          return {
            ...item,
            read_at: item.read_at || new Date().toISOString(),
            is_read: true
          };
        })
      );
    } catch {
      await loadClientNotifications();
    } finally {
      setReadingNotificationUid("");
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

    void postMobileEvent({
      event_type: "repeat_booking_open",
      source: "mobile",
      target_type: "booking",
      target_id: booking?.id ? String(booking.id) : null,
      owner_type: booking?.salon_slug ? "salon" : null,
      owner_slug: booking?.salon_slug || null,
      route: "#/booking",
      payload_json: {
        source: "client_cabinet",
        client_id: String(clientId || ""),
        booking_id: booking?.id ? String(booking.id) : null,
        salon_slug: booking?.salon_slug || null,
        master_id: booking?.master_id ? String(booking.master_id) : null,
        service_id: booking?.service_id ? String(booking.service_id) : null
      }
    }).catch((error) => {
      console.warn("CLIENT_REPEAT_BOOKING_EVENT_FAILED", String(error?.message || error || ""));
    });

    window.location.hash = `#/booking?${params.toString()}`;
  }

  if (loading) {
    return (
      <div style={getPageStyle(isMobile)}>
        <div style={getCardStyle(isMobile)}>
          <p style={styles.muted}>{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={getPageStyle(isMobile)}>
        <div style={getCardStyle(isMobile)}>
          <h1 style={getTitleStyle(isMobile)}>{copy.title}</h1>
          <p style={styles.error}>{error}</p>
          <button type="button" onClick={loadClientCabinet} style={getActionButtonStyle(styles.primaryButton, isMobile)}>
            {copy.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={getPageStyle(isMobile)}>
      <div style={getHeaderStyle(isMobile)}>
        <div>
          <p style={styles.eyebrow}>TOTEM</p>
          <h1 style={getTitleStyle(isMobile)}>{copy.title}</h1>
          <p style={styles.muted}>
            {copy.intro}
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        <section style={getCardStyle(isMobile)}>
          <h2 style={styles.sectionTitle}>{copy.profile}</h2>

          <form onSubmit={saveProfile} style={styles.form}>
            <label style={styles.label}>
              {copy.name}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={styles.input}
                placeholder={copy.yourName}
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
              {copy.phone}
              <input
                value={data?.client?.phone || ""}
                readOnly
                style={{
                  ...styles.input,
                  background: "#f3f4f6",
                  color: "#6b7280"
                }}
              />
              <span style={styles.hint}>{copy.phoneReadOnly}</span>
            </label>

            {saveError ? <p style={styles.error}>{saveError}</p> : null}
            {saveOk ? <p style={styles.success}>{saveOk}</p> : null}

            <button type="submit" disabled={saving} style={getActionButtonStyle(styles.primaryButton, isMobile)}>
              {saving ? copy.saving : copy.save}
            </button>
          </form>
        </section>

        <section style={getCardStyle(isMobile)}>
          <h2 style={styles.sectionTitle}>{copy.personalLink}</h2>
          <p style={styles.muted}>
            {copy.personalLinkNote}
          </p>

          <div style={styles.linkBox}>{personalLink}</div>

          <button type="button" onClick={copyPersonalLink} style={getActionButtonStyle(styles.secondaryButton, isMobile)}>
            {copy.copyLink}
          </button>

          {copyStatus ? <p style={styles.success}>{copyStatus}</p> : null}
        </section>

        {usClient ? (
          <p role="note" style={styles.muted}>{copy.pushUnavailable}</p>
        ) : (
          <ClientPushOptInCard clientId={clientId} token={token} />
        )}
      </div>

      <section style={getCardStyle(isMobile)}>
        <div style={styles.sectionHeaderWithBadge}>
          <h2 style={styles.sectionTitle}>{notificationCopy.header}</h2>
          <span style={styles.unreadBadge}>{usClient ? "New: " + unreadCount : t("notifications.newCount", {count: unreadCount})}</span>
        </div>

        {notificationsLoading ? (
          <p style={styles.muted}>{notificationCopy.loading}</p>
        ) : notificationsError ? (
          <p style={styles.error}>{notificationCopy.error}</p>
        ) : notificationItems.length ? (
          <div style={styles.notificationList}>
            {notificationItems.map((notification) => {
              const notificationUid = getNotificationUid(notification);
              const isRead = Boolean(notification?.read_at || notification?.is_read);
              const actionUrl = stageLinkPolicy.safe(notification?.action_url || "", "action");
              const hasAction = Boolean(actionUrl);
              const isExternal = /^https?:\/\//i.test(actionUrl);

              return (
                <div key={notificationUid || notification.id} style={styles.notificationItem}>
                  <div style={styles.notificationMain}>
                    <strong style={styles.notificationTitle}>{<NotificationText notification={notification} field="title" fallback={t("notifications.title")} />}</strong>
                    <p style={styles.muted}>{<NotificationText notification={notification} field="body" fallback="—" />}</p>
                    <div style={styles.notificationMeta}>
                      <span style={styles.badge}><NotificationLabel kind="target" value={notification.target_type || "client"} /></span>
                      <span style={styles.notificationPill}><NotificationLabel kind="priority" value={notification.priority || "normal"} /></span>
                      <span style={styles.notificationTime}>{usClient
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC", timeZoneName: "short", month: "short",
        day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
      }).format(new Date(notification.created_at))
    : localeDate(notification.created_at)}</span>
                    </div>
                    {hasAction ? (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={actionUrl}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noreferrer" : undefined}
                          style={getActionLinkStyle(styles.secondaryButton, isMobile)}
                        >
                          {notificationCopy.open}
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <div style={styles.notificationRight}>
                    <span style={isRead ? styles.notificationRead : styles.notificationUnread}>
                      {isRead ? notificationCopy.read : notificationCopy.new}
                    </span>
                    {!isRead && notificationUid ? (
                      <button
                        type="button"
                        onClick={() => readNotification(notification)}
                        disabled={readingNotificationUid === notificationUid}
                        style={getActionButtonStyle(styles.secondaryButton, isMobile)}
                      >
                        {notificationCopy.read}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={styles.muted}>{notificationCopy.empty}</p>
        )}
      </section>

      <section style={getCardStyle(isMobile)}>
        <h2 style={styles.sectionTitle}>{copy.currentBooking}</h2>

        {latestBooking ? (
          <div style={styles.bookingCard}>
            <div>
              <strong>{latestBooking.service_name || copy.service}</strong>
              <p style={styles.muted}>{formatClientBookingTime(latestBooking)}</p>
            </div>

            <div style={styles.bookingMeta}>
              <span style={styles.badge}>{clientBookingStatusLabel(latestBooking)}</span>
              <span>{formatClientBookingMoney(latestBooking)}</span>
            </div>

            <div style={styles.bookingDetails}>
              <span>{copy.master}: {latestBooking.master_name || "—"}</span>
              <span>{copy.salon}: {latestBooking.salon_name || latestBooking.salon_slug || "—"}</span>
            </div>

            <button type="button" onClick={() => repeatBooking(latestBooking)} style={getActionButtonStyle(styles.secondaryButton, isMobile)}>
              {copy.repeat}
            </button>
          </div>
        ) : (
          <p style={styles.muted}>{copy.noBooking}</p>
        )}
      </section>

      <section style={getCardStyle(isMobile)}>
        <h2 style={styles.sectionTitle}>{copy.bookingHistory}</h2>

        {bookings.length ? (
          <div style={styles.list}>
            {bookings.map((booking) => (
              <div key={booking.id} style={getHistoryRowStyle(isMobile)}>
                <div>
                  <strong>{booking.service_name || copy.service}</strong>
                  <p style={styles.muted}>{formatClientBookingTime(booking)}</p>
                  <p style={styles.muted}>
                    {booking.master_name || copy.master} · {booking.salon_name || booking.salon_slug || copy.salon}
                  </p>
                </div>

                <div style={getHistoryRightStyle(isMobile)}>
                  <span style={styles.badge}>{clientBookingStatusLabel(booking)}</span>
                  <span style={styles.paymentBadge}>{clientBookingPaymentLabel(booking)}</span>
                  <span>{formatClientBookingMoney(booking)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.muted}>{copy.noHistory}</p>
        )}
      </section>

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{data?.stats?.bookings_total || 0}</span>
          <span style={styles.statLabel}>{copy.total}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{data?.stats?.active_bookings || 0}</span>
          <span style={styles.statLabel}>{copy.active}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{data?.stats?.completed_bookings || 0}</span>
          <span style={styles.statLabel}>{copy.completed}</span>
        </div>
      </section>
    </div>
  );
}

const styles = {
  eyebrow: {
    margin: "0 0 6px",
    color: "#6b7280",
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase"
  },
  grid: {
    maxWidth: "1040px",
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px"
  },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: "20px"
  },
  sectionHeaderWithBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
    flexWrap: "wrap"
  },
  unreadBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: 700,
    whiteSpace: "nowrap"
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
  notificationList: {
    display: "grid",
    gap: "12px"
  },
  notificationItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid #e5e7eb",
    background: "#f8fafc"
  },
  notificationMain: {
    display: "grid",
    gap: "8px",
    minWidth: 0
  },
  notificationTitle: {
    fontSize: "15px",
    lineHeight: 1.4
  },
  notificationMeta: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center"
  },
  notificationPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#f3f4f6",
    color: "#374151",
    fontSize: "12px",
    fontWeight: 800
  },
  notificationTime: {
    color: "#6b7280",
    fontSize: "12px"
  },
  notificationRight: {
    display: "grid",
    justifyItems: "end",
    alignContent: "start",
    gap: "8px",
    minWidth: "120px"
  },
  notificationRead: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "12px",
    fontWeight: 800
  },
  notificationUnread: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 800
  },
  paymentBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "12px",
    lineHeight: 1.3,
    border: "1px solid #e2e8f0"
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
