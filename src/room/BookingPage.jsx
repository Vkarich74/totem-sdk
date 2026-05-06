import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MobileShell,
  MobileTopBar,
  MobileHero,
  MobileSection,
  MobileCard,
  MobileButton,
  MobileBadge,
  MobilePill,
  MobileEmptyState,
  MobileStatCard
} from "../mobile/MobileUi.jsx";

const API_BASE = import.meta.env.VITE_API_BASE;
const BOOKING_PAYMENT_STATE_PREFIX = "TOTEM_BOOKING_PAYMENT_STATE";

function generateKey() {
  return crypto.randomUUID();
}

function formatBookingNumber(id) {
  return "BR-" + String(id).padStart(5, "0");
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().split("T")[0];
}

function currentTimeHHMM() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(11, 16);
}

function roundUpToStepHHMM(hhmm, stepMin) {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  let total = h * 60 + m;
  const rem = total % stepMin;
  if (rem !== 0) total += stepMin - rem;
  if (total >= 24 * 60) total = 24 * 60 - stepMin;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function generateTimeOptions(stepMin = 15) {
  const out = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMin) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    out.push(`${hh}:${mm}`);
  }
  return out;
}

function formatDateRu(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

function getPaymentStatusLabel(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "confirmed") return "Оплата получена";
  if (normalized === "failed") return "Оплата не прошла";
  if (normalized === "refunded") return "Оплата возвращена";
  return "Ожидаем оплату";
}

function getBookingPaymentStateKey(slug) {
  return `${BOOKING_PAYMENT_STATE_PREFIX}:${String(slug || "").trim()}`;
}

function readBookingPaymentState(slug) {
  if (!slug) return null;

  try {
    const raw = window.sessionStorage.getItem(getBookingPaymentStateKey(slug));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.successData?.bookingId) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeBookingPaymentState(slug, successData, paymentData) {
  if (!slug || !successData?.bookingId) return;

  try {
    window.sessionStorage.setItem(
      getBookingPaymentStateKey(slug),
      JSON.stringify({
        successData,
        paymentData: paymentData || null,
        savedAt: Date.now()
      })
    );
  } catch {
    // sessionStorage can be unavailable in restricted browser modes
  }
}

function clearBookingPaymentState(slug) {
  if (!slug) return;

  try {
    window.sessionStorage.removeItem(getBookingPaymentStateKey(slug));
  } catch {
    // sessionStorage can be unavailable in restricted browser modes
  }
}

function getPaymentIdFromData(paymentData) {
  return paymentData?.payment_id || paymentData?.payment?.id || paymentData?.id || "";
}

function getQrTransactionIdFromData(paymentData) {
  return (
    paymentData?.qr_transaction_id ||
    paymentData?.payment?.qr_transaction_id ||
    paymentData?.transaction_id ||
    paymentData?.status?.qr_transaction_id ||
    ""
  );
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();

  const slug =
    searchParams.get("salon") ||
    window.SALON_SLUG ||
    null;

  const repeatMasterId = searchParams.get("master") || "";
  const repeatServiceId = searchParams.get("service") || "";
  const repeatClientId = searchParams.get("client") || "";
  const repeatClientToken = searchParams.get("token") || searchParams.get("client_token") || "";

  const [masters, setMasters] = useState([]);
  const [services, setServices] = useState([]);

  const [selectedMaster, setSelectedMaster] = useState("");
  const [selectedMasterName, setSelectedMasterName] = useState("");

  const [selectedService, setSelectedService] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatusLoading, setPaymentStatusLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentData, setPaymentData] = useState(null);

  const submitLockRef = useRef(false);
  const paymentLockRef = useRef(false);
  const restoredStateRef = useRef(false);

  useEffect(() => {
    if (!slug || restoredStateRef.current) return;

    restoredStateRef.current = true;

    const restored = readBookingPaymentState(slug);
    if (!restored?.successData) return;

    setSuccessData(restored.successData);
    setPaymentData(restored.paymentData || null);
    setPaymentError("");
  }, [slug]);

  useEffect(() => {
    if (!slug || !successData?.bookingId) return;
    writeBookingPaymentState(slug, successData, paymentData);
  }, [slug, successData, paymentData]);

  useEffect(() => {
    if (!slug) {
      setError("Slug салона не найден");
      setInitLoading(false);
      return;
    }

    async function loadData() {
      try {
        const [mastersRes, servicesRes] = await Promise.all([
          fetch(`${API_BASE}/public/salons/${slug}/masters`),
          fetch(`${API_BASE}/public/salons/${slug}/services`)
        ]);

        const mastersData = await mastersRes.json();
        const servicesData = await servicesRes.json();

        const loadedMasters = mastersData.masters || [];
        const loadedServices = servicesData.services || [];

        setMasters(loadedMasters);
        setServices(loadedServices);

        if (repeatMasterId) {
          const repeatedMaster = loadedMasters.find((m) => String(m.id) === String(repeatMasterId));

          if (repeatedMaster) {
            setSelectedMaster(String(repeatedMaster.id));
            setSelectedMasterName(repeatedMaster.name || "");
          }
        }

        if (repeatServiceId) {
          const repeatedService = loadedServices.find((s) => (
            String(s.id) === String(repeatServiceId) ||
            String(s.service_pk) === String(repeatServiceId)
          ));

          if (repeatedService) {
            setSelectedService(String(repeatedService.id));
          }
        }

      } catch {
        setError("Ошибка загрузки данных");
      } finally {
        setInitLoading(false);
      }
    }

    loadData();
  }, [slug, repeatMasterId, repeatServiceId]);

  useEffect(() => {
    if (!repeatClientId || !repeatClientToken) return;

    let active = true;

    async function loadRepeatClient() {
      try {
        const response = await fetch(`${API_BASE}/public/clients/${repeatClientId}/${repeatClientToken}`);
        const payload = await response.json().catch(() => null);

        if (!active) return;

        if (!response.ok || payload?.ok !== true || !payload?.client) {
          return;
        }

        setClientName(payload.client.name || "");
        setClientPhone(payload.client.phone || "");
      } catch {
        // Repeat booking prefill is optional. Form remains usable manually.
      }
    }

    loadRepeatClient();

    return () => {
      active = false;
    };
  }, [repeatClientId, repeatClientToken]);

  useEffect(() => {
    if (!paymentData?.payment_id) return;
    if (String(paymentData?.status || paymentData?.payment?.status || "").toLowerCase() === "confirmed") return;

    const timer = window.setInterval(() => {
      checkPaymentStatus({ silent: true });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paymentData?.payment_id, paymentData?.status, paymentData?.payment?.status]);

  function validatePhone(phone) {
    return /^[0-9+\-\s()]{6,20}$/.test(phone);
  }

  const filteredServices = useMemo(() => {
    if (!selectedMaster) return [];
    return services.filter((s) => String(s.master_id) === String(selectedMaster));
  }, [services, selectedMaster]);

  const timeOptions = useMemo(() => {
    const options = generateTimeOptions(15);
    if (!date) return options;

    const today = todayISO();
    if (date !== today) return options;

    const min = roundUpToStepHHMM(currentTimeHHMM(), 15);
    return options.filter((t) => t >= min);
  }, [date]);

  useEffect(() => {
    if (!time) return;
    if (!timeOptions.includes(time)) setTime("");
  }, [time, timeOptions]);

  function handleBookingSubmit(e) {
    e.preventDefault();
    if (!selectedMaster || !selectedService || !date || !time || !clientName || !clientPhone) {
      setError("Заполните все поля");
      return;
    }
    if (!validatePhone(clientPhone)) {
      setError("Введите корректный номер телефона");
      return;
    }
    setError("");
    confirmBooking();
  }

  async function confirmBooking() {
    if (loading || submitLockRef.current) return;

    submitLockRef.current = true;
    setLoading(true);
    setError("");

    try {
      const startAt = `${date}T${time}:00`;

      const bookingPayload = {
        master_id: Number(selectedMaster),
        service_id: Number(selectedService), // ← ВАЖНО
        start_at: startAt,
        client_name: clientName,
        phone: clientPhone
      };

      const res = await fetch(`${API_BASE}/public/salons/${slug}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": generateKey()
        },
        body: JSON.stringify(bookingPayload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Ошибка создания записи");
      }

      const nextSuccessData = {
        bookingId: data.booking_id || data?.booking?.id,
        masterName: selectedMasterName,
        date,
        time,
        clientName,
        client: data?.client || null,
        clientCabinetUrl: data?.client_cabinet?.url || ""
      };

      setSuccessData(nextSuccessData);
      setPaymentData(null);
      setPaymentError("");
      writeBookingPaymentState(slug, nextSuccessData, null);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  }

  async function startPayment() {
    if (!successData?.bookingId || paymentLoading || paymentLockRef.current) return;

    paymentLockRef.current = true;
    setPaymentLoading(true);
    setPaymentError("");

    try {
      const res = await fetch(`${API_BASE}/internal/payments/xpay/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          booking_id: successData.bookingId
        })
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Не удалось создать оплату");
      }

      const nextPaymentData = {
        ...data,
        payment_id: data.payment_id || data?.payment?.id,
        qr_transaction_id: data.qr_transaction_id || data?.payment?.qr_transaction_id || data.transaction_id || null,
        status: data?.payment?.status || data.status || "pending"
      };

      setPaymentData(nextPaymentData);
      writeBookingPaymentState(slug, successData, nextPaymentData);
    } catch (err) {
      setPaymentError(err.message);
    } finally {
      setPaymentLoading(false);
      paymentLockRef.current = false;
    }
  }

  async function checkPaymentStatus(options = {}) {
    const paymentId = getPaymentIdFromData(paymentData);
    const qrTransactionId = getQrTransactionIdFromData(paymentData);

    if (!paymentId || paymentStatusLoading) return;

    if (!options.silent) {
      setPaymentError("");
    }

    setPaymentStatusLoading(true);

    try {
      const requestBody = {
        payment_id: paymentId
      };

      if (qrTransactionId) {
        requestBody.qr_transaction_id = qrTransactionId;
      }

      const res = await fetch(`${API_BASE}/internal/payments/xpay/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Не удалось проверить оплату");
      }

      const nextPaymentData = {
        ...(paymentData || {}),
        ...data,
        payment_id: data.payment_id || data?.payment?.id || paymentId,
        qr_transaction_id: data.qr_transaction_id || data?.payment?.qr_transaction_id || qrTransactionId || null,
        status: data?.payment?.status || data.totem_status || data.status || paymentData?.status || "pending"
      };

      setPaymentData(nextPaymentData);
      if (successData?.bookingId) {
        writeBookingPaymentState(slug, successData, nextPaymentData);
      }
    } catch (err) {
      if (!options.silent) {
        setPaymentError(err.message);
      }
    } finally {
      setPaymentStatusLoading(false);
    }
  }

  function resetForm() {
    clearBookingPaymentState(slug);
    setSuccessData(null);
    setPaymentData(null);
    setPaymentError("");
    setStep("form");
    setDate("");
    setTime("");
    setSelectedMaster("");
    setSelectedMasterName("");
    setSelectedService("");
    setClientName("");
    setClientPhone("");
    setError("");
  }

  if (initLoading) {
    return (
      <MobileShell>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
          <MobileTopBar
            title="TOTEM"
            subtitle={`Запись · ${slug || "салон не выбран"}`}
            right={<MobileBadge tone="neutral">загрузка</MobileBadge>}
          />
          <MobileHero
            eyebrow="Запись"
            title="Запись в салон"
            subtitle="Выберите мастера, услугу, дату и время"
          />
          <MobileCard title="Загрузка записи" subtitle="Подтягиваем мастеров и услуги салона.">
            <MobileEmptyState
              title="Скоро откроется форма записи"
              description="Пожалуйста, подождите несколько секунд, пока TOTEM загружает данные салона."
            />
          </MobileCard>
        </div>
      </MobileShell>
    );
  }

  if (successData) {
    const paymentStatus = paymentData?.status || paymentData?.payment?.status || "";
    const qrImage = paymentData?.qr_image || paymentData?.payment?.qr_image || "";
    const qrCode = paymentData?.qr_code || paymentData?.payment?.qr_code || "";
    const paymentId = getPaymentIdFromData(paymentData);
    const isPaymentConfirmed = String(paymentStatus || "").toLowerCase() === "confirmed";

    return (
      <MobileShell>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
          <MobileTopBar
            title="TOTEM"
            subtitle={`Запись · ${slug || "салон не выбран"}`}
            right={<MobileBadge tone="success">запись создана</MobileBadge>}
          />

          <MobileHero
            eyebrow="Подтверждение"
            title="Запись создана"
            subtitle="Сохраните номер записи и проверьте оплату, если она нужна."
          />

          <MobileCard
            title="Проверьте запись"
            subtitle="Все данные уже сохранены. Ниже - краткое подтверждение."
            footer={
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <MobileStatCard label="Клиент" value={successData.clientName} tone="primary" />
                  <MobileStatCard label="Салон" value={slug} tone="neutral" />
                  <MobileStatCard label="Мастер" value={successData.masterName || "—"} tone="success" />
                  <MobileStatCard label="Дата" value={formatDateRu(successData.date)} tone="warning" />
                </div>
                <MobileButton tone="secondary" onClick={resetForm}>
                  Создать ещё запись
                </MobileButton>
              </div>
            }
          >
            <div style={{ display: "grid", gap: 10 }}>
              <MobilePill tone="primary">№ {formatBookingNumber(successData.bookingId)}</MobilePill>
              {successData.clientCabinetUrl ? (
                <a href={successData.clientCabinetUrl} style={styles.clientCabinetLink}>
                  Перейти в кабинет клиента
                </a>
              ) : null}

              {successData.clientCabinetUrl ? (
                <div style={styles.clientCabinetHint}>
                  <div style={styles.clientCabinetHintTitle}>Мой кабинет клиента</div>
                  <div style={styles.clientCabinetHintText}>
                    Сохраните персональную ссылку. По ней можно открыть историю записей, повторить запись и обновить данные клиента.
                  </div>
                </div>
              ) : null}
            </div>
          </MobileCard>

          <MobileCard title="Оплата" subtitle="Платёж и QR сохраняются в том же потоке, что и раньше.">
            <div style={{ display: "grid", gap: 12 }}>
              {!paymentData ? (
                <MobileButton onClick={startPayment} disabled={paymentLoading}>
                  {paymentLoading ? "Создаём оплату..." : "Оплатить через XPAY"}
                </MobileButton>
              ) : (
                <>
                  <MobileBadge tone={isPaymentConfirmed ? "success" : "warning"}>
                    {getPaymentStatusLabel(paymentStatus)}
                  </MobileBadge>

                  {paymentId ? <MobilePill tone="neutral">Платёж № {paymentId}</MobilePill> : null}

                  {qrImage && !isPaymentConfirmed ? <img src={qrImage} alt="XPAY QR" style={styles.qrImage} /> : null}

                  {qrCode && !isPaymentConfirmed ? (
                    <a href={qrCode} target="_blank" rel="noreferrer" style={styles.payLink}>
                      Открыть страницу оплаты
                    </a>
                  ) : null}

                  <MobileButton tone="secondary" onClick={() => checkPaymentStatus()} disabled={paymentStatusLoading}>
                    {paymentStatusLoading ? "Проверяем..." : isPaymentConfirmed ? "Обновить статус оплаты" : "Проверить оплату"}
                  </MobileButton>
                </>
              )}

              {paymentError ? <div style={styles.error}>{paymentError}</div> : null}
            </div>
          </MobileCard>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
        <MobileTopBar
          title="TOTEM"
          subtitle={`Запись · ${slug || "салон не выбран"}`}
          right={<MobileBadge tone="primary">запись</MobileBadge>}
        />

        <MobileHero
          eyebrow="Запись"
          title="Запись в салон"
          subtitle="Выберите мастера, услугу, дату и время"
          actions={
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <MobilePill tone="neutral">{slug || "slug не найден"}</MobilePill>
              <MobilePill tone="primary">24h запись</MobilePill>
            </div>
          }
        />

        <MobileSection title="Запись в один шаг" subtitle="Выберите услугу, время и подтвердите запись.">
          <MobileCard>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <MobilePill tone="primary">Услуга</MobilePill>
              <MobilePill tone="neutral">Время</MobilePill>
              <MobilePill tone="neutral">Контакты</MobilePill>
              <MobilePill tone="success">Подтверждение</MobilePill>
            </div>
          </MobileCard>
        </MobileSection>

        <form onSubmit={handleBookingSubmit} style={{ display: "grid", gap: 16 }}>
          <MobileSection title="Ваши данные" subtitle="Нужны для подтверждения записи.">
            <MobileCard>
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  type="text"
                  name="client_name"
                  aria-label="Имя клиента"
                  placeholder="Ваше имя"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={styles.input}
                />

                <input
                  type="tel"
                  name="client_phone"
                  aria-label="Телефон клиента"
                  placeholder="Телефон"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  style={styles.input}
                />
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection title="Мастер и услуга" subtitle="Сначала мастер, потом подходящая услуга.">
            <MobileCard
              footer={
                <MobilePill tone="neutral">
                  {selectedMaster ? "Мастер выбран" : "Сначала выберите мастера"}
                </MobilePill>
              }
            >
              <div style={{ display: "grid", gap: 12 }}>
                <select
                  name="master_id"
                  aria-label="Выбор мастера"
                  value={selectedMaster}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedMaster(id);
                    const master = masters.find((m) => String(m.id) === id);
                    setSelectedMasterName(master?.name || "");
                    setSelectedService("");
                  }}
                  style={styles.input}
                >
                  <option value="">Выберите мастера</option>
                  {masters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  name="service_id"
                  aria-label="Выбор услуги"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  style={styles.input}
                >
                  <option value="">Выберите услугу</option>
                  {filteredServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.price}сом
                    </option>
                  ))}
                </select>

                {masters.length ? null : (
                  <MobileEmptyState
                    title="Мастера пока не найдены"
                    description="Как только салон опубликует специалистов, они появятся здесь."
                  />
                )}
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection title="Дата и время" subtitle="Выберите удобный день и доступный слот.">
            <MobileCard
              footer={<MobilePill tone="warning">{date ? `Дата: ${formatDateRu(date)}` : "Сначала выберите дату"}</MobilePill>}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  type="date"
                  name="booking_date"
                  aria-label="Дата записи"
                  min={todayISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={styles.input}
                />

                <select
                  name="booking_time"
                  aria-label="Выбор времени"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={styles.input}
                  disabled={!date}
                >
                  <option value="">
                    {date ? "Выберите время" : "Сначала выберите дату"}
                  </option>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection title="Итог записи" subtitle="Проверьте данные и подтвердите запись.">
            <MobileCard
              title="Итог записи"
              subtitle="Если всё верно, подтвердите запись."
              footer={
                <MobileButton type="submit" disabled={loading}>
                  Подтвердить запись
                </MobileButton>
              }
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <MobileStatCard label="Мастер" value={selectedMasterName || "—"} tone="primary" />
                  <MobileStatCard label="Услуга" value={selectedService ? "Выбрана" : "Не выбрана"} tone="success" />
                  <MobileStatCard label="Дата" value={date ? formatDateRu(date) : "—"} tone="warning" />
                  <MobileStatCard label="Время" value={time || "—"} tone="neutral" />
                </div>

                {filteredServices.length ? null : (
                  <MobileEmptyState
                    title="Услуги пока не найдены"
                    description="После выбора мастера здесь появятся доступные услуги."
                  />
                )}
              </div>
            </MobileCard>
          </MobileSection>

          {error ? <MobileEmptyState title="Ошибка" description={error} /> : null}
        </form>
      </div>
    </MobileShell>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f7f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14
  },
  input: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid #ddd"
  },
  button: {
    padding: 14,
    borderRadius: 12,
    border: "none",
    background: "#111",
    color: "#fff",
    fontWeight: 600
  },
  secondaryButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #111",
    background: "#fff",
    fontWeight: 600
  },
  successBlock: {
    marginBottom: 20,
    lineHeight: "1.8"
  },
  bookingNumber: {
    padding: 12,
    background: "#111",
    color: "#fff",
    textAlign: "center",
    borderRadius: 12,
    fontWeight: 600,
    marginBottom: 16
  },
  clientCabinetLink: {
    display: "block",
    textAlign: "center",
    padding: 12,
    borderRadius: 12,
    background: "#fff",
    color: "#111",
    border: "1px solid #111",
    textDecoration: "none",
    fontWeight: 600,
    marginBottom: 16
  },
  clientCabinetHint: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#f9fafb"
  },
  clientCabinetHintTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 6,
    color: "#111827"
  },
  clientCabinetHintText: {
    fontSize: 14,
    lineHeight: "1.6",
    color: "#4b5563"
  },
  paymentBlock: {
    marginBottom: 16,
    padding: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#fafafa"
  },
  paymentTitle: {
    margin: "0 0 10px 0",
    fontSize: 18
  },
  paymentStatus: {
    padding: 10,
    borderRadius: 10,
    background: "#111",
    color: "#fff",
    textAlign: "center",
    fontWeight: 600,
    marginBottom: 10
  },
  paymentStatusConfirmed: {
    padding: 10,
    borderRadius: 10,
    background: "#0f7a3b",
    color: "#fff",
    textAlign: "center",
    fontWeight: 600,
    marginBottom: 10
  },
  paymentMeta: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    marginBottom: 10
  },
  qrImage: {
    display: "block",
    width: "100%",
    maxWidth: 240,
    margin: "10px auto",
    borderRadius: 12
  },
  payLink: {
    display: "block",
    textAlign: "center",
    padding: 12,
    borderRadius: 12,
    background: "#fff",
    color: "#111",
    border: "1px solid #111",
    textDecoration: "none",
    fontWeight: 600,
    marginTop: 10
  },
  error: {
    color: "#d32f2f",
    marginTop: 10,
    textAlign: "center"
  }
};
