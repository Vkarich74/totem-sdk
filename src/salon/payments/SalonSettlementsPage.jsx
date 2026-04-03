import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.API_BASE ||
  "https://api.totemv.com"

function money(value){
  return `${new Intl.NumberFormat("ru-RU").format(Number(value) || 0)} сом`
}

function formatDateTime(value){
  if(!value) return "—"

  const date = new Date(value)

  if(Number.isNaN(date.getTime())){
    return "—"
  }

  return `${date.toLocaleDateString("ru-RU")} ${date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  })}`
}

function safeParse(text){
  try{
    return JSON.parse(text)
  }catch{
    return null
  }
}

function normalizeSettlements(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.settlements)) return payload.settlements
  if(Array.isArray(payload?.periods)) return payload.periods
  if(Array.isArray(payload?.items)) return payload.items
  if(Array.isArray(payload?.data?.settlements)) return payload.data.settlements
  return []
}

function getStatusLabel(value){
  const status = String(value || "").toLowerCase()
  if(status === "open") return "Открыт"
  if(status === "closed") return "Закрыт"
  if(status === "pending") return "Ожидает"
  return value || "—"
}

function getBillingUi(billingAccess, billingBlockReason){
  const state = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    billingAccess?.subscription_status ||
    "active"
  ).toLowerCase()

  if(state === "blocked"){
    return {
      title: "Доступ ограничен",
      tone: "#b42318",
      bg: "#fff5f5",
      border: "#f5c2c7",
      note: billingBlockReason || "Финансовые действия временно ограничены"
    }
  }

  if(state === "grace"){
    return {
      title: "Льготный период",
      tone: "#9a6700",
      bg: "#fff8db",
      border: "#facc15",
      note: billingBlockReason || "Доступ открыт, но скоро потребуется продление"
    }
  }

  return {
    title: "Доступ активен",
    tone: "#027a48",
    bg: "#ecfdf3",
    border: "#abefc6",
    note: "Расчётные периоды и денежные данные доступны без ограничений"
  }
}

function FinanceNav({ slug, active }){
  const items = [
    { key: "finance", label: "Финансы", note: "overview", to: buildSalonPath(slug, "finance") },
    { key: "money", label: "Доход", note: "деньги сейчас", to: buildSalonPath(slug, "money") },
    { key: "settlements", label: "Сеты", note: "расчётные периоды", to: buildSalonPath(slug, "settlements") },
    { key: "payouts", label: "Выплаты", note: "фактические выплаты", to: buildSalonPath(slug, "payouts") },
    { key: "transactions", label: "Транзакции", note: "ledger", to: buildSalonPath(slug, "transactions") },
    { key: "contracts", label: "Контракты", note: "договоры мастеров", to: buildSalonPath(slug, "contracts") }
  ]

  return (
    <nav aria-label="Финансовые разделы" style={styles.navGrid}>
      {items.map((item) => {
        const isActive = item.key === active

        return (
          <Link
            key={item.key}
            to={item.to}
            style={{
              ...styles.navCard,
              borderColor: isActive ? "#dbeafe" : "#e5e7eb",
              background: isActive ? "#eff6ff" : "#ffffff"
            }}
          >
            <div style={{ ...styles.navTitle, color: isActive ? "#1d4ed8" : "#111827" }}>{item.label}</div>
            <div style={styles.navNote}>{item.note}</div>
          </Link>
        )
      })}
    </nav>
  )
}

function StatCard({ title, value, note }){
  return (
    <article style={styles.statCard}>
      <div style={styles.statLabel}>{title}</div>
      <div style={styles.statValue}>{value}</div>
      {note ? <div style={styles.statNote}>{note}</div> : null}
    </article>
  )
}

function Panel({ title, note, children }){
  return (
    <section style={styles.panel}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.panelTitle}>{title}</h2>
        {note ? <p style={styles.panelNote}>{note}</p> : null}
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  )
}

function EmptyBox({ title, text }){
  return (
    <div style={styles.emptyBox}>
      <h3 style={styles.emptyTitle}>{title}</h3>
      <p style={styles.emptyText}>{text}</p>
    </div>
  )
}

export default function SalonSettlementsPage(){
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)

  const {
    billingAccess,
    billingBlockReason,
    canWithdraw,
    loading: contextLoading,
    error: contextError
  } = useSalonContext()

  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadSettlements(){
      if(!slug){
        if(!cancelled){
          setSettlements([])
          setLoading(false)
          setError("Не найден salon slug")
        }
        return
      }

      try{
        setLoading(true)
        setError("")

        const response = await fetch(`${API_BASE}/internal/salons/${encodeURIComponent(slug)}/settlements`)
        const text = await response.text()

        if(cancelled) return

        const data = safeParse(text)

        if(!data || !response.ok){
          throw new Error("SALON_SETTLEMENTS_FETCH_FAILED")
        }

        setSettlements(normalizeSettlements(data))
      }catch(e){
        console.error("SALON_SETTLEMENTS_LOAD_FAILED", e)

        if(!cancelled){
          setSettlements([])
          setError("Не удалось загрузить расчётные периоды")
        }
      }finally{
        if(!cancelled){
          setLoading(false)
        }
      }
    }

    loadSettlements()

    return () => {
      cancelled = true
    }
  }, [slug])

  const totalAmount = useMemo(() => {
    return settlements.reduce((acc, item) => {
      return acc + (Number(item?.amount ?? item?.total_amount) || 0)
    }, 0)
  }, [settlements])

  const openCount = useMemo(() => {
    return settlements.filter((item) => String(item?.status || "").toLowerCase() === "open").length
  }, [settlements])

  const closedCount = useMemo(() => {
    return settlements.filter((item) => String(item?.status || "").toLowerCase() === "closed").length
  }, [settlements])

  const lastSettlement = settlements[0] || null
  const billingUi = getBillingUi(billingAccess, billingBlockReason)
  const pageLoading = contextLoading || loading
  const pageError = !pageLoading && (contextError || error)
  const pageEmpty = !pageLoading && !pageError && settlements.length === 0

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {slug ? <FinanceNav slug={slug} active="settlements" /> : null}

        <header style={styles.pageHeader}>
          <p style={styles.eyebrow}>Salon finance / mobile</p>
          <h1 style={styles.pageTitle}>Сеты</h1>
          <p style={styles.pageSubtitle}>
            Расчётные периоды салона: суммы, даты начала и окончания, текущий статус и готовность к выводу.
          </p>
        </header>

        <section
          style={{
            ...styles.alert,
            background: billingUi.bg,
            borderColor: billingUi.border
          }}
        >
          <div style={styles.alertMain}>
            <h2 style={{ ...styles.alertTitle, color: billingUi.tone }}>{billingUi.title}</h2>
            <p style={styles.alertText}>{billingUi.note}</p>
          </div>
          <div style={styles.alertMeta}>
            <div>Вывод: {canWithdraw ? "разрешён" : "ограничен"}</div>
            <div>Периодов: {settlements.length}</div>
          </div>
        </section>

        <section style={styles.statsGrid}>
          <StatCard title="Всего сетов" value={settlements.length} note="Все найденные расчётные периоды" />
          <StatCard title="Общая сумма" value={money(totalAmount)} note="Сумма по всем периодам" />
          <StatCard title="Открытые" value={openCount} note="Периоды, ещё не закрытые системой" />
          <StatCard title="Закрытые" value={closedCount} note={lastSettlement ? `Последний статус: ${getStatusLabel(lastSettlement?.status)}` : "Данных пока нет"} />
        </section>

        <div style={styles.mainStack}>
          <Panel
            title="Лента расчётных периодов"
            note="Каждый сет выводится отдельной карточкой. На мобильном экране сначала идёт смысловой заголовок, затем даты и сумма."
          >
            {pageLoading ? <div style={styles.infoText}>Загрузка...</div> : null}

            {pageError ? (
              <EmptyBox
                title={contextError ? "Ошибка shell-слоя" : "Ошибка загрузки"}
                text={contextError ? "Не удалось определить состояние кабинета салона" : error}
              />
            ) : null}

            {pageEmpty ? (
              <EmptyBox
                title="Сеты отсутствуют"
                text="Расчётные периоды появятся после накопления транзакций и закрытия операций. Каркас страницы уже готов под mobile-first сценарий."
              />
            ) : null}

            {!pageLoading && !pageError && !pageEmpty ? (
              <>
                <div style={styles.listHeader}>
                  <div>
                    <h3 style={styles.listTitle}>Последние периоды</h3>
                    <p style={styles.listNote}>Короткий обзор без перегруза: период, статус, сумма и ключевые даты.</p>
                  </div>
                  <div style={styles.listMeta}>
                    Последний сет: {lastSettlement ? formatDateTime(lastSettlement?.period_end || lastSettlement?.created_at) : "—"}
                  </div>
                </div>

                <div style={styles.cardsList}>
                  {settlements.map((item, index) => (
                    <article key={item?.id || index} style={styles.itemCard}>
                      <div style={styles.itemTop}>
                        <div>
                          <h3 style={styles.itemTitle}>{item?.id || `Сет ${index + 1}`}</h3>
                          <p style={styles.itemSubtitle}>
                            {formatDateTime(item?.period_start || item?.start_date)} → {formatDateTime(item?.period_end || item?.end_date)}
                          </p>
                        </div>
                        <div style={styles.badge}>{getStatusLabel(item?.status)}</div>
                      </div>

                      <div style={styles.metaGrid}>
                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}>Сумма</div>
                          <div style={styles.metaValue}>{money(item?.amount ?? item?.total_amount)}</div>
                        </div>

                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}>Создан</div>
                          <div style={styles.metaValue}>{formatDateTime(item?.created_at)}</div>
                        </div>

                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}>Начало периода</div>
                          <div style={styles.metaValue}>{formatDateTime(item?.period_start || item?.start_date)}</div>
                        </div>

                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}>Конец периода</div>
                          <div style={styles.metaValue}>{formatDateTime(item?.period_end || item?.end_date)}</div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </Panel>

          <Panel
            title="Короткий статус модуля"
            note="Страница держит стабильный верхний DOM при любых данных и даёт однородное поведение вместе с выплатами и транзакциями."
          >
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Режим вывода</div>
                <div style={styles.infoValue}>{canWithdraw ? "Разрешён" : "Ограничен"}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Последняя сумма</div>
                <div style={styles.infoValue}>{lastSettlement ? money(lastSettlement?.amount ?? lastSettlement?.total_amount) : "—"}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Последний статус</div>
                <div style={styles.infoValue}>{lastSettlement ? getStatusLabel(lastSettlement?.status) : "—"}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Открытых периодов</div>
                <div style={styles.infoValue}>{openCount}</div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: "14px 14px 20px",
    background: "#f8fafc",
    minHeight: "100%"
  },
  container: {
    maxWidth: "980px",
    margin: "0 auto"
  },
  pageHeader: {
    marginBottom: "16px"
  },
  eyebrow: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    color: "#475467",
    textTransform: "uppercase",
    letterSpacing: "0.04em"
  },
  pageTitle: {
    margin: "6px 0 0",
    fontSize: "30px",
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#111827"
  },
  pageSubtitle: {
    margin: "8px 0 0",
    fontSize: "14px",
    color: "#667085",
    lineHeight: 1.55
  },
  navGrid: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    paddingBottom: "4px",
    marginBottom: "16px",
    scrollbarWidth: "thin"
  },
  navCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px 14px",
    textDecoration: "none",
    display: "block",
    minWidth: "150px",
    flex: "0 0 auto",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
  },
  navTitle: {
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "4px"
  },
  navNote: {
    fontSize: "12px",
    color: "#6b7280"
  },
  alert: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "14px",
    marginBottom: "16px"
  },
  alertMain: {
    minWidth: 0,
    flex: "1 1 240px"
  },
  alertTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 800
  },
  alertText: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#475467",
    lineHeight: 1.45
  },
  alertMeta: {
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.6,
    textAlign: "right"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "12px",
    marginBottom: "16px"
  },
  statCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "14px",
    minHeight: "116px"
  },
  statLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "8px"
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#111827"
  },
  statNote: {
    marginTop: "8px",
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.45
  },
  mainStack: {
    display: "grid",
    gap: "14px"
  },
  panel: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "16px",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
  },
  sectionHeader: {
    display: "grid",
    gap: "6px"
  },
  panelTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    color: "#111827"
  },
  panelNote: {
    margin: 0,
    fontSize: "13px",
    color: "#6b7280",
    lineHeight: 1.5
  },
  infoText: {
    fontSize: "14px",
    color: "#6b7280"
  },
  emptyBox: {
    border: "1px dashed #d1d5db",
    borderRadius: "14px",
    background: "#f9fafb",
    padding: "16px"
  },
  emptyTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827"
  },
  emptyText: {
    margin: "6px 0 0",
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: 1.5
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "14px"
  },
  listTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 800,
    color: "#111827"
  },
  listNote: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#6b7280",
    lineHeight: 1.45
  },
  listMeta: {
    fontSize: "12px",
    color: "#667085"
  },
  cardsList: {
    display: "grid",
    gap: "12px"
  },
  itemCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "14px"
  },
  itemTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap"
  },
  itemTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 800,
    color: "#111827"
  },
  itemSubtitle: {
    margin: "4px 0 0",
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: 1.45
  },
  badge: {
    borderRadius: "999px",
    background: "#f3f4f6",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#374151"
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginTop: "14px"
  },
  metaCell: {
    borderTop: "1px solid #eef2f7",
    paddingTop: "12px"
  },
  metaLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px"
  },
  metaValue: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.45,
    wordBreak: "break-word"
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px"
  },
  infoItem: {
    borderTop: "1px solid #eef2f7",
    paddingTop: "12px"
  },
  infoLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px"
  },
  infoValue: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.45
  }
}
