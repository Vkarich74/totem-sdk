import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE;

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

export default function BookingPage() {
  const [searchParams] = useSearchParams();

  const slug =
    searchParams.get("salon") ||
    window.SALON_SLUG ||
    null;

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

  const submitLockRef = useRef(false);

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
          fetch(`${API_BASE}/internal/salons/${slug}/services`)
        ]);

        const mastersData = await mastersRes.json();
        const servicesData = await servicesRes.json();

        setMasters(mastersData.masters || []);
        setServices(servicesData.services || []);

      } catch {
        setError("Ошибка загрузки данных");
      } finally {
        setInitLoading(false);
      }
    }

    loadData();
  }, [slug]);

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

  function goToPreview(e) {
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
    setStep("preview");
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

      setSuccessData({
        bookingId: data.booking_id || data?.booking?.id,
        masterName: selectedMasterName,
        date,
        time,
        clientName
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  }

  function resetForm() {
    setSuccessData(null);
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
      <div style={styles.page}>
        <div style={styles.card}>Загрузка...</div>
      </div>
    );
  }

  if (successData) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>Запись подтверждена</h2>

          <div style={styles.successBlock}>
            <div><strong>Клиент:</strong> {successData.clientName}</div>
            <div><strong>Салон:</strong> {slug}</div>
            <div><strong>Мастер:</strong> {successData.masterName}</div>
            <div><strong>Дата:</strong> {formatDateRu(successData.date)}</div>
            <div><strong>Время:</strong> {successData.time}</div>
          </div>

          <div style={styles.bookingNumber}>
            № {formatBookingNumber(successData.bookingId)}
          </div>

          <button onClick={resetForm} style={styles.secondaryButton}>
            Создать ещё запись
          </button>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>Подтвердите запись</h2>

          <div style={styles.successBlock}>
            <div><strong>Клиент:</strong> {clientName}</div>
            <div><strong>Телефон:</strong> {clientPhone}</div>
            <div><strong>Салон:</strong> {slug}</div>
            <div><strong>Мастер:</strong> {selectedMasterName}</div>
            <div><strong>Дата:</strong> {formatDateRu(date)}</div>
            <div><strong>Время:</strong> {time}</div>
          </div>

          <button onClick={confirmBooking} style={styles.button}>
            Подтвердить
          </button>

          <button onClick={() => setStep("form")} style={styles.secondaryButton}>
            Назад
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>Запись на приём</h2>

        <form onSubmit={goToPreview} style={styles.form}>
          <input
            type="text"
            placeholder="Ваше имя"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            style={styles.input}
          />

          <input
            type="tel"
            placeholder="Телефон"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            style={styles.input}
          />

          <select
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
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={styles.input}
          >
            <option value="">Выберите услугу</option>
            {filteredServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.price}₸
              </option>
            ))}
          </select>

          <input
            type="date"
            min={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={styles.input}
          />

          <select
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

          <button type="submit" style={styles.button}>
            Продолжить
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </form>
      </div>
    </div>
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
  error: {
    color: "#d32f2f",
    marginTop: 10,
    textAlign: "center"
  }
};