import { useEffect, useMemo, useState } from "react";
import "./AdminDashboard.css";

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "");

const SOURCES = [
  { key: "leads", label: "Лиды", url: "/internal/admin/leads", icon: "users", href: "#/admin/leads" },
  { key: "cases", label: "Кейсы", url: "/internal/admin/moderation", icon: "shield", href: "#/admin/cases" },
  { key: "messages", label: "Сообщения", url: "/internal/admin/messages", icon: "message", href: "#/admin/messages" },
];

const ICONS = {
  dashboard: ["M3 3h8v8H3z", "M15 3h6v5h-6z", "M15 12h6v9h-6z", "M3 15h8v6H3z"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M19 8h4", "M21 6v4"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M12 7v6", "M12 17h.01"],
  message: ["M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3a8.5 8.5 0 0 1 8.5 8.5z", "M8 11h9", "M8 14h6"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  building: ["M3 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16", "M3 21h18", "M7 7h2", "M12 7h2", "M7 11h2", "M12 11h2", "M7 15h2", "M12 15h2", "M17 9h4v12"],
  clients: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  "person-add": ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M19 8v6", "M16 11h6"],
  wallet: ["M3 6h18v14H3z", "M3 10h18", "M7 16h3", "M16 16h2"],
  withdraw: ["M12 3v13", "M7 11l5 5 5-5", "M4 17v4h16v-4"],
  mobile: ["M6 2h12v20H6z", "M11 18h2"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  refresh: ["M20 7v5h-5", "M4 17v-5h5", "M5.4 9A7 7 0 0 1 17.7 6L20 12", "M4 12l2.3 6A7 7 0 0 0 18.6 15"],
  chevron: ["M9 18l6-6-6-6"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  close: ["M18 6 6 18", "M6 6l12 12"],
  check: ["M20 6 9 17l-5-5"],
  clock: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20", "M12 6v6l4 2"],
  alert: ["M12 3 2 21h20L12 3z", "M12 9v5", "M12 18h.01"],
  activity: ["M22 12h-4l-3 9-6-18-3 9H2"],
};

function Icon({ name, size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {(ICONS[name] || ICONS.dashboard).map((d) => <path d={d} key={d} />)}
    </svg>
  );
}

function getToken() {
  try {
    return String(window.localStorage.getItem("TOTEM_AUTH_TOKEN") || "").trim();
  } catch {
    return "";
  }
}

function moveTo(event, hash) {
  if (event && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
  if (event) event.preventDefault();
  if (window.location.hash === hash) return;
  // AdminRouter currently reads the hash at render time. Preserve the known-good reload contract.
  window.location.hash = hash;
  window.location.reload();
}

function Link({ to, icon, className = "", children, active, onNavigate }) {
  return (
    <a href={to} className={className} aria-current={active ? "page" : undefined}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (onNavigate) onNavigate();
        moveTo(event, to);
      }}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </a>
  );
}

function pending() {
  return Object.fromEntries(SOURCES.map((source) => [
    source.key, { loading: true, error: "", items: null, count: null, fullTotal: false },
  ]));
}

async function getCollection(source, token, signal) {
  const response = await fetch(API_BASE + source.url, {
    method: "GET", signal,
    headers: { Accept: "application/json", Authorization: "Bearer " + token },
  });
  if (!String(response.headers.get("content-type") || "").toLowerCase().includes("json")) {
    throw new Error("HTTP " + response.status + ": ответ не JSON");
  }
  const payload = await response.json();
  if (!response.ok || payload?.ok === false) {
    throw new Error(String(payload?.error || "HTTP " + response.status));
  }
  if (!Array.isArray(payload?.data?.items)) {
    throw new Error("Контракт списка API изменён");
  }
  const items = payload.data.items;
  const total = payload.data.total_count ?? payload.total_count;
  const fullTotal = typeof total === "number" && Number.isInteger(total) && total >= items.length;
  return { loading: false, error: "", items, count: fullTotal ? total : items.length, fullTotal };
}

function Metric({ source, data }) {
  const failed = !data.loading && Boolean(data.error);
  return (
    <Link to={source.href} className={"tc-metric" + (failed ? " tc-metric--error" : "")}>
      <span className="tc-metric__top">
        <span className="tc-metric__icon"><Icon name={source.icon} size={22} /></span>
        <Icon name="chevron" size={17} />
      </span>
      <span className="tc-metric__value" aria-label={data.loading ? "Загрузка" : failed ? "Недоступно" : String(data.count)}>
        {data.loading ? <span className="tc-skeleton" aria-hidden="true" /> :
          failed ? "—" : data.count.toLocaleString("ru-RU")}
      </span>
      <strong className="tc-metric__label">{source.label}</strong>
      <span className={"tc-metric__note" + (failed ? " tc-metric__note--error" : "")}>
        {data.loading ? "Получение данных…" : failed ? "Ошибка получения" :
          data.fullTotal ? "Всего по данным API" : "Загружено записей"}
      </span>
    </Link>
  );
}

function Action({ to, icon, title, description, meta, alert }) {
  return (
    <Link to={to} className="tc-action">
      <span className="tc-action__icon"><Icon name={icon} /></span>
      <span className="tc-action__body"><strong>{title}</strong><small>{description}</small></span>
      <span className={"tc-action__meta" + (alert ? " tc-action__meta--warn" : "")}>{meta}</span>
      <Icon name="chevron" size={16} />
    </Link>
  );
}

export default function AdminDashboardPage() {
  const token = getToken();
  const [summary, setSummary] = useState(pending);
  const [refresh, setRefresh] = useState(0);
  const [checked, setChecked] = useState(null);

  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    const controller = new AbortController();
    setSummary(pending());
    setChecked(null);
    Promise.all(SOURCES.map(async (source) => {
      try {
        return [source.key, await getCollection(source, token, controller.signal)];
      } catch (error) {
        return [source.key, {
          loading: false, error: error?.message || "Ошибка получения", items: null,
          count: null, fullTotal: false,
        }];
      }
    })).then((rows) => {
      if (!alive) return;
      setSummary(Object.fromEntries(rows));
      setChecked(new Date());
    });
    return () => { alive = false; controller.abort(); };
  }, [token, refresh]);

  const failedMessages = useMemo(() => {
    const items = summary.messages?.items;
    if (!Array.isArray(items)) return null;
    return items.filter((item) => String(item?.status || "").toLowerCase() === "failed").length;
  }, [summary.messages?.items]);

  const pendingCases = useMemo(() => {
    const items = summary.cases?.items;
    if (!Array.isArray(items)) return null;
    const actionable = new Set(["new", "open", "pending", "in_review"]);
    return items.filter((item) => actionable.has(String(item?.status || "").toLowerCase())).length;
  }, [summary.cases?.items]);

  const statuses = SOURCES.map((source) => summary[source.key]);
  const loading = statuses.some((item) => item.loading);
  const good = statuses.filter((item) => !item.loading && !item.error).length;
  const errors = statuses.filter((item) => !item.loading && item.error).length;
  const time = checked ? checked.toLocaleTimeString("ru-RU", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bishkek",
  }) : "";

  if (!token) {
    return (
      <main className="totem-control-center tc-login-required">
        <h1>Требуется вход администратора</h1>
        <Link to="#/admin/login?returnTo=/admin" className="tc-login-link">Войти</Link>
      </main>
    );
  }

  return (
    <div className="tc-container tc-dashboard-content">
            <div className="tc-heading">
              <div>
                <div className="tc-eyebrow"><span /> УПРАВЛЕНИЕ ПЛАТФОРМОЙ</div>
                <h1>Обзор платформы</h1>
                <p>Операционная сводка, приоритетные задачи и доступ к разделам TOTEM.</p>
              </div>
              <button className="tc-refresh" type="button" disabled={loading}
                onClick={() => setRefresh((value) => value + 1)}>
                <Icon name="refresh" size={18} /> {loading ? "Обновление…" : "Обновить"}
              </button>
            </div>

            <section className="tc-metrics" aria-label="Основные показатели">
              {SOURCES.map((source) => <Metric key={source.key} source={source} data={summary[source.key]} />)}
            </section>

            {errors ? (
              <div className="tc-error" role="alert">
                <Icon name="alert" size={21} />
                <div>
                  <strong>Часть данных недоступна</strong>
                  <p>Ошибки API не заменяются нулями. Обновите сведения или проверьте соответствующий раздел.</p>
                  <ul>
                    {SOURCES.filter((source) => summary[source.key]?.error).map((source) => (
                      <li key={source.key}>{source.label}: {summary[source.key].error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="tc-panels">
              <section className="tc-panel" aria-labelledby="tc-tasks-title">
                <div className="tc-panel__heading">
                  <span className="tc-panel__icon"><Icon name="shield" /></span>
                  <div><h2 id="tc-tasks-title">Требует внимания</h2><p>Действующие рабочие разделы</p></div>
                </div>
                <Action to="#/admin/leads" icon="users" title="Лиды и заявки"
                  description="Просмотр входящих обращений"
                  meta={summary.leads.loading ? "…" : summary.leads.error ? "Нет данных" :
                    String(summary.leads.count) + " записей"} />
                <Action to="#/admin/cases" icon="shield" title="Модерация"
                  description="Проверка кейсов и решений"
                  meta={pendingCases === null || pendingCases === 0 ? "Открыть" : String(pendingCases) + " на проверке"}
                  alert={pendingCases > 0} />
                <Action to="#/admin/messages" icon="message" title="Доставка сообщений"
                  description="Проверка ошибок и статусов"
                  meta={failedMessages === null || failedMessages === 0 ? "Открыть" : String(failedMessages) + " ошибок"}
                  alert={failedMessages > 0} />
                <Action to="#/admin/open-owner" icon="person-add" title="Подключение владельцев"
                  description="Проверка заявок и активация доступа" meta="Открыть" />
              </section>

              <section className="tc-panel" aria-labelledby="tc-health-title">
                <div className="tc-panel__heading">
                  <span className="tc-panel__icon"><Icon name="activity" /></span>
                  <div><h2 id="tc-health-title">Состояние панели</h2><p>Проверенные источники сводки</p></div>
                </div>
                <div className="tc-health" aria-live="polite">
                  <div><span><Icon name="activity" size={17} /> Источники API</span>
                    <b className={errors ? "tc-health--warn" : good === 3 ? "tc-health--ok" : ""}>
                      {loading ? "Проверка…" : String(good) + " из 3 доступны"}
                    </b>
                  </div>
                  <div><span><Icon name="check" size={17} /> Доступ к Admin</span>
                    <b>Сессия подтверждена</b>
                  </div>
                  <div><span><Icon name="clock" size={17} /> Время проверки</span>
                    <b>{time ? time + " · Бишкек" : "Выполняется"}</b>
                  </div>
                  <div><span><Icon name="bell" size={17} /> Интеграции</span><b>Не проверялись</b></div>
                </div>
                <p className="tc-health__note">
                  Доступность относится только к трём источникам этой страницы.
                  WhatsApp и платёжные провайдеры здесь не проверяются.
                </p>
              </section>
            </div>

            <section className="tc-shortcuts" aria-labelledby="tc-shortcuts-title">
              <h2 id="tc-shortcuts-title">Быстрый доступ</h2>
              <p>Переход в существующие разделы без изменения их содержимого.</p>
              <div className="tc-shortcuts__grid">
                <Link to="#/admin/owners" icon="building">Владельцы</Link>
                <Link to="#/admin/clients" icon="clients">Клиенты</Link>
                <Link to="#/admin/finance" icon="wallet">Финансы</Link>
                <Link to="#/admin/withdrawals" icon="withdraw">Центр вывода</Link>
                <Link to="#/admin/notifications" icon="bell">Уведомления</Link>
                <Link to="#/admin/mobile" icon="mobile">Мобильное</Link>
              </div>
            </section>

            <footer className="tc-footer">
              <span>TOTEM · Control Center</span>
              <span>Показатели выводятся из действующих API без тестовых записей.</span>
            </footer>
    </div>
  );
}
