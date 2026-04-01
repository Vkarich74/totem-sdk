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

function normalizePayouts(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.payouts)) return payload.payouts
  if(Array.isArray(payload?.items)) return payload.items
  if(Array.isArray(payload?.data?.payouts)) return payload.data.payouts
  return []
}

function getStatusLabel(value){
  const status = String(value || "").toLowerCase()
  if(status === "pending") return "Ожидает"
  if(status === "processing") return "Обрабатывается"
  if(status === "completed") return "Завершено"
  if(status === "failed") return "Ошибка"
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
    note: "Выплаты и движение денег доступны без ограничений"
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
    <div style={styles.navGrid}>
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
    </div>
  )
}

function StatCard({ title, value, note }){
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{title}</div>
      <div style={styles.statValue}>{value}</div>
      {note ? <div style={styles.statNote}>{note}</div> : null}
    </div>
  )
}

function Panel({ title, note, children }){
  return (
    <section style={styles.panel}>
      <div style={styles.panelTitle}>{title}</div>
      {note ? <div style={styles.panelNote}>{note}</div> : null}
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  )
}

function EmptyBox({ title, text }){
  return (
    <div style={styles.emptyBox}>
      <div style={styles.emptyTitle}>{title}</div>
      <div style={styles.emptyText}>{text}</div>
    </div>
  )
}

export default function SalonPayoutsPage(){
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)

  const {
    billingAccess,
    billingBlockReason,
    canWithdraw,
    loading: contextLoading,
    error: contextError
  } = useSalonContext()

  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadPayouts(){
      if(!slug){
        if(!cancelled){
          setPayouts([])
          setLoading(false)
          setError("Не найден salon slug")
        }
        return
      }

      try{
        setLoading(true)
        setError("")

        const response = await fetch(`${API_BASE}/internal/salons/${encodeURIComponent(slug)}/payouts`)
        const text = await response.text()

        if(cancelled) return

        const data = safeParse(text)

        if(!data || !response.ok){
          throw new Error("SALON_PAYOUTS_FETCH_FAILED")
        }

        setPayouts(normalizePayouts(data))
      }catch(e){
        console.error("SALON_PAYOUTS_LOAD_FAILED", e)

        if(!cancelled){
          setPayouts([])
          setError("Не удалось загрузить выплаты")
        }
      }finally{
        if(!cancelled){
          setLoading(false)
        }
      }
    }

    loadPayouts()

    return () => {
      cancelled = true
    }
  }, [slug])

  const totalAmount = useMemo(() => {
    return payouts.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0)
  }, [payouts])

  const completedCount = useMemo(() => {
    return payouts.filter((item) => String(item?.status || "").toLowerCase() === "completed").length
  }, [payouts])

  const pendingCount = useMemo(() => {
    return payouts.filter((item) => {
      const status = String(item?.status || "").toLowerCase()
      return status === "pending" || status === "processing"
    }).length
  }, [payouts])

  const lastPayout = payouts[0] || null
  const billingUi = getBillingUi(billingAccess, billingBlockReason)

  return (
    <div style={styles.page}>
      {slug ? <FinanceNav slug={slug} active="payouts" /> : null}

      <Panel title="Выплаты" note="Фактические выплаты салона, суммы, статусы и последние проведённые операции.">
        {contextLoading || loading ? <div style={styles.infoText}>Загрузка...</div> : null}

        {!contextLoading && contextError ? (
          <EmptyBox
            title="Ошибка shell-слоя"
            text="Не удалось определить состояние кабинета салона"
          />
        ) : null}

        {!contextLoading && !loading && error ? (
          <EmptyBox
            title="Ошибка загрузки"
            text={error}
          />
        ) : null}

        {!contextLoading && !loading && !error && payouts.length === 0 ? (
          <EmptyBox
            title="Выплат пока нет"
            text="Выплаты появятся после обработки заявок и закрытия расчётных периодов"
          />
        ) : null}

        {!contextLoading && !loading && !error && payouts.length > 0 ? (
          <>
            <div
              style={{
                ...styles.alert,
                background: billingUi.bg,
                borderColor: billingUi.border
              }}
            >
              <div>
                <div style={{ ...styles.alertTitle, color: billingUi.tone }}>{billingUi.title}</div>
                <div style={styles.alertText}>{billingUi.note}</div>
              </div>
              <div style={styles.alertMeta}>
                <div>Вывод: {canWithdraw ? "разрешён" : "ограничен"}</div>
                <div>Выплат: {payouts.length}</div>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <StatCard title="Всего выплат" value={payouts.length} note="Все найденные выплаты" />
              <StatCard title="Общая сумма" value={money(totalAmount)} note="Сумма по всем выплатам" />
              <StatCard title="В обработке" value={pendingCount} note="Ожидают завершения" />
              <StatCard
                title="Последняя выплата"
                value={lastPayout ? money(lastPayout?.amount) : "—"}
                note={lastPayout ? getStatusLabel(lastPayout?.status) : "Данных пока нет"}
              />
            </div>

            <div style={styles.cardsList}>
              {payouts.map((item, index) => (
                <div key={item?.id || index} style={styles.itemCard}>
                  <div style={styles.itemTop}>
                    <div>
                      <div style={styles.itemTitle}>{item?.id || `Выплата ${index + 1}`}</div>
                      <div style={styles.itemSubtitle}>{formatDateTime(item?.created_at || item?.date)}</div>
                    </div>
                    <div style={styles.badge}>{getStatusLabel(item?.status)}</div>
                  </div>

                  <div style={styles.metaGrid}>
                    <div style={styles.metaCell}>
                      <div style={styles.metaLabel}>Сумма</div>
                      <div style={styles.metaValue}>{money(item?.amount)}</div>
                    </div>

                    <div style={styles.metaCell}>
                      <div style={styles.metaLabel}>Создана</div>
                      <div style={styles.metaValue}>{formatDateTime(item?.created_at || item?.date)}</div>
                    </div>

                    <div style={styles.metaCell}>
                      <div style={styles.metaLabel}>Reference</div>
                      <div style={styles.metaValue}>{item?.reference || item?.reference_id || "—"}</div>
                    </div>

                    <div style={styles.metaCell}>
                      <div style={styles.metaLabel}>Статус</div>
                      <div style={styles.metaValue}>{getStatusLabel(item?.status)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </Panel>
    </div>
  )
}

const styles = {
  page: {
    padding: "14px 14px 20px"
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
    flex: "0 0 auto"
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
  panel: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    background: "#ffffff",
    padding: "16px",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
  },
  panelTitle: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#111827"
  },
  panelNote: {
    marginTop: "6px",
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
    fontSize: "15px",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "6px"
  },
  emptyText: {
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: 1.5
  },
  alert: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "16px"
  },
  alertTitle: {
    fontSize: "14px",
    fontWeight: 800
  },
  alertText: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#6b7280",
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
    fontSize: "15px",
    fontWeight: 800,
    color: "#111827"
  },
  itemSubtitle: {
    marginTop: "4px",
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
    lineHeight: 1.45
  }
}
