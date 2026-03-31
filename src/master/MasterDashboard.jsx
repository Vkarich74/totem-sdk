import PageSection from "../cabinet/PageSection";
import StatCard from "../cabinet/StatCard";
import StatGrid from "../cabinet/StatGrid";
import { useMaster } from "./MasterContext";

function money(n){
  return new Intl.NumberFormat("ru-RU").format(Number(n)||0)+" сом"
}

export default function MasterDashboard() {
  const {
    metrics,
    loading,
    error,
    slug,
    master,
    empty
  } = useMaster();

  const masterName = master?.name || "";

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Панель мастера</h2>

        <div style={{
          border: "1px solid #f5c2c7",
          background: "#fff5f5",
          color: "#b42318",
          borderRadius: "10px",
          padding: "12px",
          marginTop: "10px"
        }}>
          Ошибка загрузки метрик
        </div>

        {slug ? (
          <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
            slug: {slug}
          </div>
        ) : null}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Панель мастера</h2>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!metrics && empty) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Панель мастера</h2>

        <div style={{
          border: "1px solid #eee",
          borderRadius: "10px",
          padding: "12px",
          background: "#fff",
          marginTop: "10px"
        }}>
          Нет данных
        </div>
      </div>
    );
  }

  const safeMetrics = metrics || {};

  return (
    <div style={{ padding: "20px" }}>
      <h2>
        Панель мастера
        {masterName ? ` — ${masterName}` : ""}
      </h2>

      <PageSection>
        <StatGrid>

          <StatCard
            title="Записей сегодня"
            value={safeMetrics.bookings_today || 0}
          />

          <StatCard
            title="Записей за неделю"
            value={safeMetrics.bookings_week || 0}
          />

          <StatCard
            title="Клиентов всего"
            value={safeMetrics.clients_total || 0}
          />

          <StatCard
            title="Доход сегодня"
            value={money(safeMetrics.revenue_today)}
          />

          <StatCard
            title="Доход за месяц"
            value={money(safeMetrics.revenue_month)}
          />

        </StatGrid>
      </PageSection>
    </div>
  );
}