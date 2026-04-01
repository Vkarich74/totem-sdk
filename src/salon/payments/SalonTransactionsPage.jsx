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

function normalizeLedger(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.ledger)) return payload.ledger
  if(Array.isArray(payload?.entries)) return payload.entries
  if(Array.isArray(payload?.items)) return payload.items
  if(Array.isArray(payload?.data?.ledger)) return payload.data.ledger
  return []
}

function getDirectionLabel(value){
  const direction = String(value || "").toLowerCase()
  if(direction === "credit") return "Пополнение"
  if(direction === "debit") return "Списание"
  return value || "—"
}

function getTypeLabel(value){
  const type = String(value || "").toLowerCase()
  if(type === "payout") return "Выплата"
  if(type === "subscription") return "Подписка"
  if(type === "platform_fee") return "Платформа"
  if(type === "payment") return "Платёж"
  if(type === "settlement") return "Сет"
  if(type === "refund_reverse") return "Refund reverse"
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
    note: "Техническая финансовая лента доступна без ограничений"
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

export default function SalonTransactionsPage(){
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)

  const {
    billingAccess,
    billingBlockReason,
    loading: contextLoading,
    error: contextError
  } = useSalonContext()

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadTransactions(){
      if(!slug){
        if(!cancelled){
          setTransactions([])
          setLoading(false)
          setError("Не найден salon slug")
        }
        return
      }

      try{
        setLoading(true)
        setError("")

        const response = await fetch(`${API_BASE}/internal/salons/${encodeURIComponent(slug)}/ledger`)
        const text = await response.text()

        if(cancelled) return

        const data = safeParse(text)

        if(!data || !response.ok){
          throw new Error("SALON_LEDGER_FETCH_FAILED")
        }

        setTransactions(normalizeLedger(data))
      }catch(e){
        console.error("SALON_TRANSACTIONS_LOAD_FAILED", e)

        if(!cancelled){
          setTransactions([])
          setError("Не удалось загрузить транзакции")
        }
      }finally{
        if(!cancelled){
          setLoading(false)
        }
      }
    }

    loadTransactions()

    return () => {
      cancelled = true
    }
  }, [slug])

  const totalAmount = useMemo(() => {
    return transactions.reduce((acc, item) => acc + (Number(item?.amount) || 0), 0)
  }, [transactions])

  const creditCount = useMemo(() => {
    return transactions.filter((item) => String(item?.direction || "").toLowerCase() === "credit").length
  }, [transactions])

  const debitCount = useMemo(() => {
    return transactions.filter((item) => String(item?.direction || "").toLowerCase() === "debit").length
  }, [transactions])

  const creditAmount = useMemo(() => {
    return transactions.reduce((acc, item) => {
      return String(item?.direction || "").toLowerCase() === "credit"
        ? acc + (Number(item?.amount) || 0)
        : acc
    }, 0)
  }, [transactions])

  const debitAmount = useMemo(() => {
    return transactions.reduce((acc, item) => {
      return String(item?.direction || "").toLowerCase() === "debit"
        ? acc + (Number(item?.amount) || 0)
        : acc
    }, 0)
  }, [transactions])

  const billingUi = getBillingUi(billingAccess, billingBlockReason)

  return (
    <div style={styles.page}>
      {slug ? <FinanceNav slug={slug} active="transactions" /> : null}

      <Panel title="Транзакции" note="Техническая финансовая лента салона: движения денег, направления и reference-связи.">
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

        {!contextLoading && !loading && !error && transactions.length === 0 ? (
          <EmptyBox
            title="Транзакций пока нет"
            text="Финансовые движения появятся здесь после операций по кошельку, сетам, выплатам и подписке"
          />
        ) : null}

        {!contextLoading && !loading && !error && transactions.length > 0 ? (
          <>
            <div style={styles.statGrid}>
              <StatCard title="Всего операций" value={transactions.length} note="Количество записей в ленте" />
              <StatCard title="Пополнения" value={money(creditAmount)} note={`${creditCount} шт.`} />
              <StatCard title="Списания" value={money(debitAmount)} note={`${debitCount} шт.`} />
              <StatCard title="Общий оборот" value={money(totalAmount)} note="Сумма всех движений" />
            </div>

            <div style={styles.billingCard}>
              <div>
                <div style={{ ...styles.billingTitle, color: billingUi.tone }}>{billingUi.title}</div>
                <div style={styles.billingText}>{billingUi.note}</div>
              </div>
              <div style={styles.billingMeta}>technical ledger view</div>
            </div>

            <div style={styles.list}>
              {transactions.map((item, index) => (
                <article key={item?.id || `${item?.reference_id || "tx"}-${index}`} style={styles.itemCard}>
                  <div style={styles.itemTop}>
                    <strong style={styles.itemTitle}>{item?.id || `Операция ${index + 1}`}</strong>
                    <span style={styles.directionBadge}>{getDirectionLabel(item?.direction)}</span>
                  </div>

                  <div style={styles.metaGrid}>
                    <div>
                      <div style={styles.metaLabel}>Тип</div>
                      <div style={styles.metaValue}>{getTypeLabel(item?.reference_type || item?.type)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Сумма</div>
                      <div style={styles.metaValue}>{money(item?.amount)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Дата</div>
                      <div style={styles.metaValue}>{formatDateTime(item?.created_at || item?.date)}</div>
                    </div>

                    <div>
                      <div style={styles.metaLabel}>Reference ID</div>
                      <div style={styles.metaValue}>{item?.reference_id || "—"}</div>
                    </div>
                  </div>
                </article>
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
    padding: "14px"
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
    minWidth: "150px",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "12px 14px",
    textDecoration: "none",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
    flex: "0 0 auto"
  },
  navTitle: {
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: 1.2
  },
  navNote: {
    fontSize: "12px",
    color: "#667085",
    marginTop: 6
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #eaecf0",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(16,24,40,0.06)"
  },
  panelTitle: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#101828"
  },
  panelNote: {
    fontSize: "13px",
    color: "#667085",
    marginTop: 6,
    lineHeight: 1.45
  },
  infoText: {
    fontSize: "14px",
    color: "#475467"
  },
  emptyBox: {
    border: "1px dashed #d0d5dd",
    borderRadius: "16px",
    padding: "18px",
    background: "#fcfcfd"
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#101828"
  },
  emptyText: {
    fontSize: "14px",
    color: "#667085",
    marginTop: 8,
    lineHeight: 1.5
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px"
  },
  statCard: {
    border: "1px solid #eaecf0",
    borderRadius: "16px",
    padding: "14px",
    background: "#ffffff"
  },
  statLabel: {
    fontSize: "13px",
    color: "#667085"
  },
  statValue: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#101828",
    marginTop: 6
  },
  statNote: {
    fontSize: "12px",
    color: "#667085",
    marginTop: 6
  },
  billingCard: {
    marginTop: 14,
    border: "1px solid #eaecf0",
    borderRadius: "16px",
    padding: "14px 16px",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center"
  },
  billingTitle: {
    fontSize: "15px",
    fontWeight: 800
  },
  billingText: {
    fontSize: "13px",
    color: "#475467",
    marginTop: 4,
    lineHeight: 1.45
  },
  billingMeta: {
    fontSize: "12px",
    color: "#667085"
  },
  list: {
    marginTop: 16,
    display: "grid",
    gap: "12px"
  },
  itemCard: {
    border: "1px solid #eaecf0",
    borderRadius: "16px",
    padding: "14px",
    background: "#ffffff"
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap"
  },
  itemTitle: {
    fontSize: "15px",
    color: "#101828"
  },
  directionBadge: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#1d4ed8",
    background: "#eff6ff",
    padding: "6px 10px",
    borderRadius: "999px"
  },
  metaGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px"
  },
  metaLabel: {
    fontSize: "12px",
    color: "#667085"
  },
  metaValue: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#111827",
    marginTop: 4,
    lineHeight: 1.4,
    wordBreak: "break-word"
  }
}
