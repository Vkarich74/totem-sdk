import PageSection from "../cabinet/PageSection";
import StatCard from "../cabinet/StatCard";
import StatGrid from "../cabinet/StatGrid";
import { useMaster } from "./MasterContext";

export default function MasterDashboard() {
  const { metrics, loading, error, slug } = useMaster();

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Панель мастера</h2>
        <p>Ошибка загрузки метрик: {error}</p>
        {slug ? (
          <p style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
            Текущий slug: {slug}
          </p>
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

  const safeMetrics = metrics || {};

  return (
    <div style={{ padding: "20px" }}>
      <h2>Панель мастера</h2>

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
            value={safeMetrics.revenue_today || 0}
          />

          <StatCard
            title="Доход за месяц"
            value={safeMetrics.revenue_month || 0}
          />
        </StatGrid>
      </PageSection>
    </div>
  );
}