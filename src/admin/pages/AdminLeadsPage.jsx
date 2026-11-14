import { useCallback, useEffect, useMemo, useState } from "react";
import AdminNavigation from "../AdminNavigation";

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "");

function getAdminToken() {
  try {
    return String(window.localStorage.getItem("TOTEM_AUTH_TOKEN") || "").trim();
  } catch {
    return "";
  }
}

const STATUS_LABELS = {
  new: "Новый",
  in_review: "На проверке",
  contacted: "Связались",
  qualified: "Квалифицирован",
  rejected: "Отклонён",
  converted: "Преобразован",
};

const TYPE_LABELS = {
  salon: "Салон",
  master: "Мастер",
  client: "Клиент",
  unknown: "Не определён",
};

function textValue(value) {
  const valueText = String(value ?? "").trim();
  return valueText || "—";
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Bishkek",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function AdminLeadsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    async function loadLeads() {
      setLoading(true);
      setError("");
      const token = getAdminToken();

      if (!token) {
        if (alive) {
          setItems([]);
          setError("NO_AUTH");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(API_BASE + "/internal/admin/leads", {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + token,
          },
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.ok !== true) {
          const code = response.status === 401 || response.status === 403
            ? "HTTP_" + response.status
            : payload?.error || "LEADS_HTTP_" + response.status;
          throw new Error(code);
        }
        if (!Array.isArray(payload?.data?.items)) {
          throw new Error("LEADS_API_CONTRACT_INVALID");
        }
        if (alive) setItems(payload.data.items);
      } catch (e) {
        if (alive && !controller.signal.aborted) {
          setItems([]);
          setError(e?.message || "LEADS_LOAD_FAILED");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadLeads();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [retry]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((row) => {
      if (status !== "all" && String(row?.status || "").toLowerCase() !== status) return false;
      if (!query) return true;
      return [row?.id, row?.name, row?.phone, row?.lead_type, row?.source, row?.assigned_to]
        .map((value) => String(value ?? "").toLowerCase()).join(" ").includes(query);
    });
  }, [items, search, status]);

  const authRequired = error === "NO_AUTH" || error === "HTTP_401" || error === "HTTP_403";

  return (
    <div style={{ padding: 20, maxWidth: 1360, margin: "0 auto" }}>
      <AdminNavigation />
      <h1>Лиды</h1>
      <p style={{ color: "#475569" }}>Режим просмотра. Статусы и количество получены из API; фильтры действуют только на загруженные лиды.</p>

      {authRequired ? (
        <div role="alert">
          Требуется вход администратора.{" "}
          <a href="#/admin/login?returnTo=/admin/leads">Войти как администратор</a>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <input aria-label="Поиск лидов" value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Имя, телефон, источник" style={{ padding: 10, flex: "1 1 230px" }} />
            <select aria-label="Фильтр статуса" value={status}
              onChange={(event) => setStatus(event.target.value)} style={{ padding: 10 }}>
              <option value="all">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) =>
                <option key={key} value={key}>{label}</option>)}
            </select>
            <button type="button" onClick={() => setRetry((value) => value + 1)}
              disabled={loading}>Обновить</button>
          </div>

          {loading ? (
            <p role="status">Загрузка лидов…</p>
          ) : error ? (
            <div role="alert" style={{ color: "#991b1b" }}>
              Не удалось загрузить лиды: {error}. Пустой список не означает отсутствие заявок.
            </div>
          ) : (
            <>
              <p role="status">Получено из API: {items.length}. По фильтрам: {filtered.length}.</p>
              {filtered.length === 0 ? (
                <p>{items.length === 0 ? "Лидов нет по ответу API." : "По выбранным фильтрам лидов нет."}</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {filtered.map((item, index) => (
                    <section key={item?.id ?? index} style={{
                      border: "1px solid #d8dee8", borderRadius: 12, padding: 14, background: "#fff",
                    }}>
                      <div><strong>{textValue(item?.name)}</strong> · {TYPE_LABELS[item?.lead_type] || textValue(item?.lead_type)}</div>
                      <div>Статус: {STATUS_LABELS[item?.status] || textValue(item?.status)}</div>
                      <div>Телефон: {textValue(item?.phone)}</div>
                      <div>Источник: {textValue(item?.source)}</div>
                      <div>ID: {textValue(item?.id)} · Создан: {formatDate(item?.created_at)}</div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}