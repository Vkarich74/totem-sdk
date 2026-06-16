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
const BOOKING_PAYMENT_STATE_VERSION = "v2";

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

function formatSalonDisplayName(salonName, slug) {
  const normalizedName = normalizeClientName(salonName);
  if (normalizedName) return normalizedName;
  if (String(slug || "").trim()) return "Выбранный салон";
  return "Салон не выбран";
}

function normalizeClientName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getKgPhoneDigits(value) {
  const cleaned = String(value || "").replace(/\D/g, "");

  if (!cleaned) return "";
  if (cleaned.startsWith("996") && cleaned.length >= 12) return `996${cleaned.slice(3, 12)}`;
  if (cleaned.startsWith("0") && cleaned.length >= 10) return `996${cleaned.slice(-9)}`;
  if (cleaned.length === 9) return `996${cleaned}`;

  return cleaned;
}

function formatKgPhoneDigits(digits) {
  const normalized = String(digits || "").replace(/\D/g, "");
  if (!normalized) return "";

  let body = normalized;

  if (body.startsWith("996")) {
    body = body.slice(3);
  } else if (body.startsWith("0")) {
    body = body.slice(1);
  }

  body = body.slice(0, 9);

  const groups = [];
  for (let index = 0; index < body.length; index += 3) {
    groups.push(body.slice(index, index + 3));
  }

  return groups.length ? `+996 ${groups.join(" ")}`.trim() : "";
}

function normalizeKgPhone(value) {
  const digits = getKgPhoneDigits(value);

  if (digits.length === 12 && digits.startsWith("996")) {
    return `+996 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 12)}`;
  }

  if (!digits) return "";

  if (digits.startsWith("996")) {
    return formatKgPhoneDigits(digits);
  }

  return formatKgPhoneDigits(`996${digits}`);
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
    if (parsed.version !== BOOKING_PAYMENT_STATE_VERSION) {
      clearBookingPaymentState(slug);
      return null;
    }

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
        version: BOOKING_PAYMENT_STATE_VERSION,
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

function getSelectedServicePrice(services, selectedService) {
  const service = Array.isArray(services)
    ? services.find((item) => String(item?.id) === String(selectedService))
    : null;

  const rawPrice = service?.price ?? service?.service_price ?? service?.servicePrice;
  const price = Number(String(rawPrice ?? "").replace(",", ".").trim());

  return Number.isFinite(price) && price > 0 ? price : null;
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const nativeSearchParams = new URLSearchParams(window.location.search || "");
  const getQueryParam = (key) => searchParams.get(key) || nativeSearchParams.get(key) || "";

  const slug =
    getQueryParam("salon") ||
    window.SALON_SLUG ||
    null;

  const repeatMasterId = getQueryParam("master");
  const repeatServiceId = getQueryParam("service");
  const repeatClientId = getQueryParam("client");
  const repeatClientToken = getQueryParam("token") || getQueryParam("client_token");

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
  const [paymentMethod, setPaymentMethod] = useState("cash");

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
    setPaymentMethod(restored.paymentData?.provider === "direct" ? "cash" : restored.paymentData ? "xpay" : "cash");
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
    if (paymentMethod !== "xpay" || paymentData?.provider === "direct") return;
    if (!paymentData?.payment_id) return;
    if (String(paymentData?.status || paymentData?.payment?.status || "").toLowerCase() === "confirmed") return;

    const timer = window.setInterval(() => {
      checkPaymentStatus({ silent: true });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paymentMethod, paymentData?.payment_id, paymentData?.status, paymentData?.payment?.status]);

  function validatePhone(phone) {
    const digits = getKgPhoneDigits(phone);
    return digits.length === 12 && digits.startsWith("996");
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
    const normalizedName = normalizeClientName(clientName);
    const normalizedPhone = normalizeKgPhone(clientPhone);

    if (normalizedName.length < 2) {
      setError("Укажите имя, чтобы мастер понял, к кому запись.");
      return;
    }
    if (!validatePhone(normalizedPhone)) {
      setError("Введите номер в формате +996 XXX XXX XXX");
      return;
    }
    if (!selectedMaster || !selectedService || !date || !time || !clientName || !clientPhone) {
      setError("Заполните все поля");
      return;
    }
    setError("");
    setClientName(normalizedName);
    setClientPhone(normalizedPhone);
    confirmBooking();
  }

  async function confirmBooking() {
    if (loading || submitLockRef.current) return;

    submitLockRef.current = true;
    setLoading(true);
    setError("");

    try {
      const startAt = `${date}T${time}:00`;
      const normalizedName = normalizeClientName(clientName);
      const normalizedPhone = normalizeKgPhone(clientPhone);

      const bookingPayload = {
        master_id: Number(selectedMaster),
        service_id: Number(selectedService), // ← ВАЖНО
        start_at: startAt,
        client_name: normalizedName,
        phone: normalizedPhone
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
        clientName: normalizedName,
        client: data?.client || null,
        clientCabinetUrl: data?.client_cabinet?.url || ""
      };

      setSuccessData(nextSuccessData);
      setPaymentError("");
      if (paymentMethod === "cash") {
        const selectedServicePrice = getSelectedServicePrice(services, selectedService);

        if (selectedServicePrice == null) {
          setPaymentData(null);
          setPaymentMethod("cash");
          setPaymentError("Не удалось определить цену услуги для оплаты наличными. Выберите услугу с ценой.");
          writeBookingPaymentState(slug, nextSuccessData, null);
          return;
        }

        try {
          const nextPaymentData = await createPendingDirectPayment(nextSuccessData.bookingId, selectedServicePrice);

          setPaymentData(nextPaymentData);
          setPaymentMethod("cash");
          setPaymentError("");
          writeBookingPaymentState(slug, nextSuccessData, nextPaymentData);
        } catch (err) {
          setPaymentData(null);
          setPaymentMethod("cash");
          setPaymentError(err.message);
          writeBookingPaymentState(slug, nextSuccessData, null);
        }
      } else {
        setPaymentData(null);
        setPaymentMethod("xpay");
        writeBookingPaymentState(slug, nextSuccessData, null);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  }

  async function startPayment() {
    const currentProvider = String(paymentData?.provider || paymentData?.payment?.provider || "").toLowerCase();
    const currentStatus = String(paymentData?.status || paymentData?.payment?.status || "").toLowerCase();
    const replacePending = currentProvider === "direct" && currentStatus === "pending";

    if (!successData?.bookingId || paymentLoading || paymentLockRef.current) return;
    if (paymentMethod !== "xpay" && !replacePending) return;

    if (currentProvider === "direct" && currentStatus === "confirmed") {
      setPaymentError("Оплата наличными подтверждена. Способ оплаты изменить нельзя.");
      return;
    }

    if (currentProvider === "xpay" && currentStatus === "confirmed") {
      setPaymentError("Оплата уже подтверждена. Способ оплаты изменить нельзя.");
      return;
    }

    if (currentProvider === "xpay" && currentStatus === "pending") {
      return;
    }

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
          booking_id: successData.bookingId,
          replace_pending: replacePending
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

  async function createPendingDirectPayment(bookingId, servicePrice) {
    const price = Number(servicePrice);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Не удалось определить цену услуги для оплаты наличными. Выберите услугу с ценой.");
    }

    const res = await fetch(`${API_BASE}/internal/payments/direct/pending`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        booking_id: bookingId,
        service_price: price
      })
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || data?.message || "Не удалось создать оплату наличными");
    }

    return {
      ...data,
      payment_id: data.payment_id || data?.payment?.id || "",
      provider: data.provider || data?.payment?.provider || "direct",
      status: data.status || data?.payment?.status || "pending"
    };
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
    setPaymentMethod("cash");
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
      <MobileShell style={bookingPageStyle}>
        <div style={bookingStackStyle}>
          <MobileTopBar
            title="TOTEM"
            subtitle={`Запись · ${formatSalonDisplayName(null, slug)}`}
            style={bookingTopBarStyle}
            right={<MobileBadge tone="neutral">загрузка</MobileBadge>}
          />
          <MobileHero
            eyebrow="Запись"
            title="Запись в салон"
            subtitle="Выберите мастера, услугу, дату и время"
            style={bookingHeroStyle}
            actions={
              <div style={bookingHeroChipsStyle}>
                <MobilePill tone="primary" style={bookingChipStyle}>Услуга</MobilePill>
                <MobilePill tone="neutral" style={bookingChipStyle}>Время</MobilePill>
                <MobilePill tone="neutral" style={bookingChipStyle}>Контакты</MobilePill>
                <MobilePill tone="success" style={bookingChipStyle}>Подтверждение</MobilePill>
              </div>
            }
          />
          <MobileCard title="Загрузка записи" subtitle="Подтягиваем мастеров и услуги салона." style={bookingCardStyle}>
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
    const isCashPayment = paymentMethod === "cash";
    const isXpayPayment = paymentMethod === "xpay";
    const isDirectPayment = paymentData?.provider === "direct";
    const paymentStatus = String(paymentData?.status || paymentData?.payment?.status || "").toLowerCase();
    const isCashPaymentPending = isCashPayment && isDirectPayment && paymentStatus === "pending";
    const isCashPaymentConfirmed = isCashPayment && isDirectPayment && paymentStatus === "confirmed";
    const qrImage = paymentData?.qr_image || paymentData?.payment?.qr_image || "";
    const qrCode = paymentData?.qr_code || paymentData?.payment?.qr_code || "";
    const paymentId = getPaymentIdFromData(paymentData);
    const isPaymentConfirmed = paymentStatus === "confirmed";

    return (
      <MobileShell style={bookingPageStyle}>
        <div style={bookingStackStyle}>
          <MobileTopBar
            title="TOTEM"
            subtitle={`Запись · ${formatSalonDisplayName(null, slug)}`}
            style={bookingTopBarStyle}
            right={<MobileBadge tone="success">запись создана</MobileBadge>}
          />

          <MobileHero
            eyebrow="Подтверждение"
            title="Запись создана"
            subtitle="Сохраните номер записи и проверьте оплату, если она нужна."
            style={bookingHeroStyle}
            actions={
              <div style={bookingHeroChipsStyle}>
                <MobilePill tone="primary" style={bookingChipStyle}>Услуга</MobilePill>
                <MobilePill tone="neutral" style={bookingChipStyle}>Время</MobilePill>
                <MobilePill tone="neutral" style={bookingChipStyle}>Контакты</MobilePill>
                <MobilePill tone="success" style={bookingChipStyle}>Подтверждение</MobilePill>
              </div>
            }
          />

          <MobileCard
            title="Проверьте запись"
            subtitle="Все данные уже сохранены. Ниже - краткое подтверждение."
            style={bookingCardStyle}
            footer={
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <MobileStatCard label="Клиент" value={successData.clientName} tone="primary" />
                  <MobileStatCard label="Салон" value={formatSalonDisplayName(successData?.salonName, slug)} tone="neutral" />
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

          <MobileCard
            title="Оплата"
            subtitle={
              isCashPayment
                ? "Оплата наличными ожидает подтверждения после создания записи."
                : "Платёж и QR сохраняются в том же потоке, что и раньше."
            }
            style={bookingCardStyle}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                <MobileButton
                  onClick={() => {
                    setPaymentMethod("cash");
                    setPaymentError("");
                    setPaymentLoading(false);
                    setPaymentStatusLoading(false);
                    if (paymentData?.provider !== "direct") {
                      setPaymentData(null);
                    }
                  }}
                  style={{
                    minHeight: 88,
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    textAlign: "left",
                    whiteSpace: "normal",
                    borderRadius: 18,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                  tone={isCashPayment ? "primary" : "secondary"}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>Оплата наличными / на месте</span>
                  <span style={{ fontSize: 13, lineHeight: 1.45, color: isCashPayment ? "rgba(255,255,255,0.88)" : "#64748B" }}>
                    Вы оплатите услугу на месте после визита.
                  </span>
                </MobileButton>
                <MobileButton
                  onClick={() => {
                    const currentProvider = String(paymentData?.provider || paymentData?.payment?.provider || "").toLowerCase();
                    const currentStatus = String(paymentData?.status || paymentData?.payment?.status || "").toLowerCase();

                    if (currentProvider === "direct" && currentStatus === "confirmed") {
                      setPaymentMethod("cash");
                      setPaymentError("Оплата наличными подтверждена. Способ оплаты изменить нельзя.");
                      return;
                    }

                    if (currentProvider === "xpay" && currentStatus === "pending") {
                      setPaymentMethod("xpay");
                      setPaymentError("XPAY QR уже создан. Для перехода на наличные нужна отмена QR.");
                      return;
                    }

                    if (currentProvider === "xpay" && currentStatus === "confirmed") {
                      setPaymentMethod("xpay");
                      setPaymentError("Оплата уже подтверждена. Способ оплаты изменить нельзя.");
                      return;
                    }

                    setPaymentMethod("xpay");
                    setPaymentError("");
                    if (currentProvider === "direct" && currentStatus === "pending") {
                      void startPayment();
                    }
                  }}
                  style={{
                    minHeight: 88,
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    textAlign: "left",
                    whiteSpace: "normal",
                    borderRadius: 18,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                  tone={isXpayPayment ? "primary" : "secondary"}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>Оплатить через XPAY</span>
                  <span style={{ fontSize: 13, lineHeight: 1.45, color: isXpayPayment ? "rgba(255,255,255,0.88)" : "#64748B" }}>
                    Показать QR и продолжить онлайн-оплату.
                  </span>
                </MobileButton>
              </div>

              {isCashPayment ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {isCashPaymentPending ? (
                    <>
                      <MobileBadge tone="warning">Оплата наличными ожидает подтверждения</MobileBadge>
                      <div style={{ fontSize: 14, lineHeight: 1.6, color: "#334155" }}>
                        Запись сохранена. Оплата будет подтверждена салоном или мастером после получения наличных.
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: "#0F766E" }}>
                        Можно перейти на XPAY до подтверждения наличных.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          padding: 14,
                          borderRadius: 16,
                          background: "#fff7ed",
                          border: "1px solid #fed7aa",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#9a3412" }}>Запись создана</div>
                        <div style={{ fontSize: 13, lineHeight: 1.55, color: "#9a3412" }}>
                          Онлайновая оплата не требуется. Оплата будет подтверждена после передачи наличных.
                        </div>
                        {paymentId ? <MobilePill tone="neutral">Платёж № {paymentId}</MobilePill> : null}
                      </div>
                    </>
                  ) : isCashPaymentConfirmed ? (
                    <>
                      <MobileBadge tone="success">Оплата наличными подтверждена</MobileBadge>
                      <div style={{ fontSize: 14, lineHeight: 1.6, color: "#334155" }}>
                        Оплата подтверждена. Запись и direct payment сохранены в системе.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          padding: 14,
                          borderRadius: 16,
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>Запись создана</div>
                        <div style={{ fontSize: 13, lineHeight: 1.55, color: "#166534" }}>
                          Оплата уже подтверждена салоном или мастером.
                        </div>
                        {paymentId ? <MobilePill tone="neutral">Платёж № {paymentId}</MobilePill> : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <MobileBadge tone="success">Оплата на месте</MobileBadge>
                      <div style={{ fontSize: 14, lineHeight: 1.6, color: "#334155" }}>
                        Вы оплатите услугу на месте после визита.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          padding: 14,
                          borderRadius: 16,
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>Запись создана</div>
                        <div style={{ fontSize: 13, lineHeight: 1.55, color: "#166534" }}>
                          Онлайн-оплата не требуется. Вы сможете рассчитаться после визита.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : !paymentData ? (
                <MobileButton onClick={startPayment} disabled={paymentLoading} style={bookingPrimaryButtonStyle}>
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
    <MobileShell style={bookingPageStyle}>
      <div style={bookingStackStyle}>
        <MobileTopBar
          title="TOTEM"
          subtitle={`Запись · ${formatSalonDisplayName(null, slug)}`}
          style={bookingTopBarStyle}
          right={<MobileBadge tone="primary">запись</MobileBadge>}
        />

          <MobileHero
            eyebrow="Запись"
            title="Запись в салон"
            subtitle="Выберите мастера, услугу, дату и время"
            style={bookingHeroStyle}
            actions={
              <div style={bookingHeroChipsStyle}>
                <MobilePill tone="neutral" style={bookingChipStyle}>{formatSalonDisplayName(null, slug)}</MobilePill>
                <MobilePill tone="primary" style={bookingChipStyle}>24h запись</MobilePill>
                <MobilePill tone="neutral" style={bookingChipStyle}>Контакты</MobilePill>
                <MobilePill tone="success" style={bookingChipStyle}>Подтверждение</MobilePill>
              </div>
            }
        />

        <MobileSection title="Запись в один шаг" subtitle="Выберите услугу, время и подтвердите запись." style={bookingSectionStyle}>
          <MobileCard style={bookingCardStyle}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <MobilePill tone="primary" style={bookingChipStyle}>Услуга</MobilePill>
              <MobilePill tone="neutral" style={bookingChipStyle}>Время</MobilePill>
              <MobilePill tone="neutral" style={bookingChipStyle}>Контакты</MobilePill>
              <MobilePill tone="success" style={bookingChipStyle}>Подтверждение</MobilePill>
            </div>
          </MobileCard>
        </MobileSection>

        <form onSubmit={handleBookingSubmit} style={{ display: "grid", gap: 16 }}>
          <MobileSection title="Ваши данные" subtitle="Нужны для подтверждения записи." style={bookingSectionStyle}>
            <MobileCard style={bookingCardStyle}>
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  type="text"
                  name="client_name"
                  aria-label="Имя клиента"
                  placeholder="Ваше имя"
                  value={clientName}
                  autoComplete="name"
                  onChange={(e) => setClientName(normalizeClientName(e.target.value))}
                  style={styles.input}
                />

                <input
                  type="tel"
                  name="client_phone"
                  aria-label="Телефон клиента"
                  placeholder="+996 ___ ___ ___"
                  value={clientPhone}
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={16}
                  onChange={(e) => setClientPhone(normalizeKgPhone(e.target.value))}
                  style={styles.input}
                />
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection title="Мастер и услуга" subtitle="Сначала мастер, потом подходящая услуга." style={bookingSectionStyle}>
            <MobileCard
              style={bookingCardStyle}
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

          <MobileSection title="Дата и время" subtitle="Выберите удобный день и доступный слот." style={bookingSectionStyle}>
            <MobileCard
              style={bookingCardStyle}
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

          <MobileSection title="Оплата" subtitle="Выберите способ оплаты до подтверждения." style={bookingSectionStyle}>
            <MobileCard style={bookingCardStyle}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                  <MobileButton
                    onClick={() => {
                      setPaymentMethod("cash");
                      setPaymentError("");
                      setPaymentLoading(false);
                      setPaymentStatusLoading(false);
                      if (paymentData?.provider !== "direct") {
                        setPaymentData(null);
                      }
                    }}
                    style={{
                      minHeight: 88,
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                      textAlign: "left",
                      whiteSpace: "normal",
                      borderRadius: 18,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                    tone={paymentMethod === "cash" ? "primary" : "secondary"}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>Оплата наличными / на месте</span>
                    <span style={{ fontSize: 13, lineHeight: 1.45, color: paymentMethod === "cash" ? "rgba(255,255,255,0.88)" : "#64748B" }}>
                      Вы оплатите услугу на месте после визита.
                    </span>
                  </MobileButton>
                  <MobileButton
                    onClick={() => {
                      const currentProvider = String(paymentData?.provider || paymentData?.payment?.provider || "").toLowerCase();
                      const currentStatus = String(paymentData?.status || paymentData?.payment?.status || "").toLowerCase();

                      if (currentProvider === "direct" && currentStatus === "confirmed") {
                        setPaymentMethod("cash");
                        setPaymentError("Оплата наличными подтверждена. Способ оплаты изменить нельзя.");
                        return;
                      }

                      if (currentProvider === "xpay" && currentStatus === "pending") {
                        setPaymentMethod("xpay");
                        setPaymentError("XPAY QR уже создан. Для перехода на наличные нужна отмена QR.");
                        return;
                      }

                      if (currentProvider === "xpay" && currentStatus === "confirmed") {
                        setPaymentMethod("xpay");
                        setPaymentError("Оплата уже подтверждена. Способ оплаты изменить нельзя.");
                        return;
                      }

                      setPaymentMethod("xpay");
                      setPaymentError("");
                    }}
                    style={{
                      minHeight: 88,
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                      textAlign: "left",
                      whiteSpace: "normal",
                      borderRadius: 18,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                    tone={paymentMethod === "xpay" ? "primary" : "secondary"}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>Оплатить через XPAY</span>
                    <span style={{ fontSize: 13, lineHeight: 1.45, color: paymentMethod === "xpay" ? "rgba(255,255,255,0.88)" : "#64748B" }}>
                      Показать QR и продолжить онлайн-оплату.
                    </span>
                  </MobileButton>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "#334155" }}>
                  {paymentMethod === "cash"
                    ? "Вы оплатите услугу на месте после визита."
                    : "Показать QR и продолжить онлайн-оплату через XPAY."}
                </div>
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection title="Итог записи" subtitle="Проверьте данные и подтвердите запись." style={bookingSectionStyle}>
            <MobileCard
              title="Итог записи"
              subtitle="Если всё верно, подтвердите запись."
              style={bookingCardStyle}
              footer={
                <MobileButton type="submit" disabled={loading} style={bookingPrimaryButtonStyle}>
                  Подтвердить запись
                </MobileButton>
              }
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <MobileStatCard label="Клиент" value={normalizeClientName(clientName) || "—"} tone="accent" />
                  <MobileStatCard label="Телефон" value={normalizeKgPhone(clientPhone) || "—"} tone="neutral" />
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

const bookingPageStyle = {
  background:
    "radial-gradient(circle at top, rgba(29,78,216,0.08) 0%, rgba(29,78,216,0.02) 28%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 52%, #ffffff 100%)",
};

const bookingStackStyle = {
  width: "100%",
  maxWidth: 560,
  margin: "0 auto",
  padding: "14px 0 28px",
  display: "grid",
  gap: 14,
  boxSizing: "border-box",
};

const bookingTopBarStyle = {
  padding: 14,
  borderRadius: 24,
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(226,232,240,0.92)",
  boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
  backdropFilter: "blur(16px)",
};

const bookingHeroStyle = {
  padding: 20,
  borderRadius: 30,
  background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 46%, #0ea5e9 100%)",
  boxShadow: "0 26px 60px rgba(29,78,216,0.20)",
  overflow: "hidden",
};

const bookingHeroChipsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const bookingSectionStyle = {
  marginTop: 0,
  padding: 18,
  borderRadius: 24,
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(226,232,240,0.92)",
  boxShadow: "0 16px 40px rgba(15,23,42,0.07)",
};

const bookingCardStyle = {
  padding: 16,
  borderRadius: 22,
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
  border: "1px solid rgba(226,232,240,0.94)",
  boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
};

const bookingChipStyle = {
  padding: "8px 11px",
};

const bookingPrimaryButtonStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  background: "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)",
  boxShadow: "0 14px 26px rgba(29,78,216,0.22)",
};

const bookingStatStyle = {
  borderRadius: 18,
  boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f7f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  input: {
    padding: "14px 14px",
    borderRadius: 16,
    border: "1px solid rgba(203,213,225,0.98)",
    background: "#fff",
    color: "#111827",
    fontSize: 14,
    lineHeight: 1.5,
    boxShadow: "0 6px 16px rgba(15,23,42,0.04)",
    outline: "none",
  },
  button: {
    padding: "14px 16px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #111827 0%, #1d4ed8 100%)",
    color: "#fff",
    fontWeight: 700,
    boxShadow: "0 14px 24px rgba(15,23,42,0.18)",
  },
  secondaryButton: {
    marginTop: 10,
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid #111",
    background: "#fff",
    fontWeight: 600,
  },
  successBlock: {
    marginBottom: 20,
    lineHeight: "1.8",
  },
  bookingNumber: {
    padding: 12,
    background: "#111",
    color: "#fff",
    textAlign: "center",
    borderRadius: 14,
    fontWeight: 600,
    marginBottom: 16,
  },
  clientCabinetLink: {
    display: "block",
    textAlign: "center",
    padding: 12,
    borderRadius: 14,
    background: "#fff",
    color: "#111",
    border: "1px solid #111",
    textDecoration: "none",
    fontWeight: 600,
    marginBottom: 16,
  },
  clientCabinetHint: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
  },
  clientCabinetHintTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 6,
    color: "#111827",
  },
  clientCabinetHintText: {
    fontSize: 14,
    lineHeight: "1.6",
    color: "#4b5563",
  },
  paymentBlock: {
    marginBottom: 16,
    padding: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#fafafa",
  },
  paymentTitle: {
    margin: "0 0 10px 0",
    fontSize: 18,
  },
  paymentStatus: {
    padding: 10,
    borderRadius: 10,
    background: "#111",
    color: "#fff",
    textAlign: "center",
    fontWeight: 600,
    marginBottom: 10,
  },
  paymentStatusConfirmed: {
    padding: 10,
    borderRadius: 10,
    background: "#0f7a3b",
    color: "#fff",
    textAlign: "center",
    fontWeight: 600,
    marginBottom: 10,
  },
  paymentMeta: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    marginBottom: 10,
  },
  qrImage: {
    display: "block",
    width: "100%",
    maxWidth: 240,
    margin: "10px auto",
    borderRadius: 12,
  },
  payLink: {
    display: "block",
    textAlign: "center",
    padding: 12,
    borderRadius: 14,
    background: "#fff",
    color: "#111",
    border: "1px solid #111",
    textDecoration: "none",
    fontWeight: 600,
    marginTop: 10,
  },
  error: {
    color: "#d32f2f",
    marginTop: 10,
    textAlign: "center",
  },
};
