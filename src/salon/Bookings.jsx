// src/salon/Bookings.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchSalonBookings } from "../api/salonBookings";
import { fetchSalonMasters } from "../api/salonMasters";

import PageSection from "../cabinet/ui/PageSection";
import StatGrid from "../cabinet/ui/StatGrid";
import TableSection from "../cabinet/ui/TableSection";
import EmptyState from "../cabinet/ui/EmptyState";

const SALON_SLUG = "totem-demo-salon";

export default function SalonBookings() {
  const [bookings, setBookings] = useState([]);
  const [masters, setMasters] = useState([]);
  const [status, setStatus] = useState("");
  const [masterId, setMasterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMasters();
    loadBookings();
  }, []);

  useEffect(() => {
    loadBookings();
  }, [status, masterId]);

  async function loadMasters() {
    try {
      const data = await fetchSalonMasters(SALON_SLUG);
      setMasters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("MASTERS_LOAD_ERROR", err);
    }
  }

  async function loadBookings() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchSalonBookings(SALON_SLUG, {
        status,
        master_id: masterId,
      });

      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("BOOKINGS_LOAD_ERROR", err);
      setError("Ошибка загрузки записей");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const completed = bookings.filter((b) => b.status === "completed").length;

    return { total, confirmed, completed };
  }, [bookings]);

  const rows = bookings.map((b) => {
    const start = new Date(b.datetime_start);
    return {
      id: b.id,
      client: b.client_name,
      service: b.service_name,
      master: b.master_name,
      date: start.toLocaleDateString("ru-RU"),
      time: start.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      price: formatKGS(b.price),
      status: mapStatus(b.status),
    };
  });

  return (
    <PageSection title="Записи салона">

      <StatGrid
        items={[
          { label: "Всего записей", value: stats.total },
          { label: "Подтверждено", value: stats.confirmed },
          { label: "Завершено", value: stats.completed },
        ]}
      />

      <div style={styles.filters}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="confirmed">Подтверждено</option>
          <option value="completed">Завершено</option>
          <option value="cancelled">Отменено</option>
        </select>

        <select value={masterId} onChange={(e) => setMasterId(e.target.value)}>
          <option value="">Все мастера</option>
          {masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Загрузка...</p>}

      {error && (
        <div style={{ color: "red" }}>
          {error}
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <EmptyState
          title="Записей пока нет"
          text="Когда клиенты начнут записываться, записи появятся здесь."
        />
      )}

      {!loading && !error && bookings.length > 0 && (
        <TableSection
          columns={[
            { key: "client", label: "Клиент" },
            { key: "service", label: "Услуга" },
            { key: "master", label: "Мастер" },
            { key: "date", label: "Дата" },
            { key: "time", label: "Время" },
            { key: "price", label: "Цена" },
            { key: "status", label: "Статус" },
          ]}
          rows={rows}
        />
      )}

    </PageSection>
  );
}

function mapStatus(status) {
  const map = {
    confirmed: "Подтверждено",
    completed: "Завершено",
    cancelled: "Отменено",
  };

  return map[status] || status;
}

function formatKGS(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat("ru-RU").format(value) + " сом";
}

const styles = {
  filters: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
};