import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE = "https://api.totemv.com";

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

  // ✅ FIX: slug fallback из window.SALON_SLUG
  const slug =
    searchParams.get("salon") ||
    window.SALON_SLUG ||
    null;

  const [masters, setMasters] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState("");
  const [selectedMasterName, setSelectedMasterName] = useState("");

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

    async function loadMasters() {
      try {
        const res = await fetch(`${API_BASE}/public/salons/${slug}/masters`);
        const data = await res.json();
        setMasters(data.masters || []);
      } catch {
        setError("Не удалось загрузить мастеров");
      } finally {
        setInitLoading(false);
      }
    }
    loadMasters();
  }, [slug]);

  function validatePhone(phone) {
    return /^[0-9+\-\s()]{6,20}$/.test(phone);
  }

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
    if (loading) return;

    if (!selectedMaster || !date || !time || !clientName || !clientPhone) {
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
    if (loading) return;
    if (submitLockRef.current) return;

    submitLockRef.current = true;
    setLoading(true);
    setError("");

    try {
      const startAt = `${date}T${time}:00`;

      const bookingPayload = {
        master_id: Number(selectedMaster),
        service_id: 3,
        start_at: startAt,
        client_id: null,
        client_payload: {
          name: clientName,
          phone: clientPhone
        }
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
        throw new Error("Ошибка создания записи");
      }

      setSuccessData({
        bookingId: data.booking_id,
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
    submitLockRef.current = false;
    setLoading(false);
    setSuccessData(null);
    setStep("form");
    setDate("");
    setTime("");
    setSelectedMaster("");
    setSelectedMasterName("");
    setClientName("");
    setClientPhone("");
    setError("");
  }

  if (initLoading) {
    return (
      <div style={{ padding: 20 }}>Загрузка...</div>
    );
  }

  if (error && !masters.length) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        {error}
      </div>
    );
  }

  if (successData) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Запись подтверждена</h2>
        <div>№ {formatBookingNumber(successData.bookingId)}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Запись на приём</h2>

      <form onSubmit={goToPreview}>
        <select
          value={selectedMaster}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedMaster(id);
            const master = masters.find((m) => String(m.id) === id);
            setSelectedMasterName(master?.name || "");
          }}
        >
          <option value="">Выберите мастера</option>
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <button type="submit">Продолжить</button>

        {error && <div style={{ color: "red" }}>{error}</div>}
      </form>
    </div>
  );
}