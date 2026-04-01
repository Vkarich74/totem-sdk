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

function normalizeWallet(payload){
  if(!payload) return null
  if(typeof payload.balance !== "undefined") return payload
  if(typeof payload.data?.balance !== "undefined") return payload.data
  if(payload.wallet) return payload.wallet
  if(payload.data?.wallet) return payload.data.wallet
  return payload
}

function normalizeSalonRoot(payload){
  if(!payload) return null
  if(payload.salon || payload.billing_access) return payload
  if(payload.data?.salon || payload.data?.billing_access) return payload.data
  return payload
}

function normalizeSettlements(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.settlements)) return payload.settlements
  if(Array.isArray(payload?.items)) return payload.items
  if(Array.isArray(payload?.data?.settlements)) return payload.data.settlements
  return []
}

function getBillingAccess(payload, contextBillingAccess){
  if(payload?.billing_access) return payload.billing_access
  if(payload?.data?.billing_access) return payload.data.billing_access
  return contextBillingAccess || null
}

function accessLabel(value, fallback = "—"){
  if(value === true) return "Разрешено"
  if(value === false) return "Ограничено"
  return fallback
}

function StatCard({ title, value, hint }){
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
      {hint ? <div style={styles.cardHint}>{hint}</div> : null}
    </div>
  )
}

function Section({ title, subtitle, children }){
  return (
    <section style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {subtitle ? <div style={styles.sectionSubtitle}>{subtitle}</div> : null}
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  )
}

function Row({ label, value }){
  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div style={styles.rowValue}>{value}</div>
    </div>
  )
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

export default function SalonMoneyPage(){
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)

  const {
    identity,
    billingAccess: contextBillingAccess,
    canWrite,
    canWithdraw,
    loading: contextLoading,
    error: contextError
  } = useSalonContext()

  const [wallet, setWallet] = useState(null)
  const [walletLoading, setWalletLoading] = useState(true)
  const [walletError, setWalletError] = useState("")

  const [salonRoot, setSalonRoot] = useState(null)
  const [rootLoading, setRootLoading] = useState(true)
  const [rootError, setRootError] = useState("")

  const [settlements, setSettlements] = useState([])
  const [settlementsLoading, setSettlementsLoading] = useState(true)
  const [settlementsError, setSettlementsError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadWallet(){
      if(!slug){
        if(!cancelled){
          setWallet(null)
          setWalletLoading(false)
          setWalletError("Не найден salon slug")
        }
        return
      }

      try{
        setWalletLoading(true)
        setWalletError("")

        const response = await fetch(`${API_BASE}/internal/salons/${encodeURIComponent(slug)}/wallet-balance`)
        const text = await response.text()

        if(cancelled) return

        const data = safeParse(text)
        if(!data || !response.ok){
          throw new Error("WALLET_FETCH_FAILED")
        }

        setWallet(normalizeWallet(data))
      }catch(e){
        console.error("SALON_MONEY_WALLET_LOAD_FAILED", e)

        if(!cancelled){
          setWallet(null)
          setWalletError("Не удалось загрузить баланс")
        }
      }finally{
        if(!cancelled){
          setWalletLoading(false)
        }
      }
    }

    loadWallet()

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    let cancelled = false

    async function loadSalonRoot(){
      if(!slug){
        if(!cancelled){
          setSalonRoot(null)
          setRootLoading(false)
          setRootError("Не найден salon slug")
        }
        return
      }

      try{
        setRootLoading(true)
        setRootError("")

        const response = await fetch(`${API_BASE}/internal/salons/${encodeURIComponent(slug)}`)
        const text = await response.text()

        if(cancelled) return

        const data = safeParse(text)
        if(!data || !response.ok){
          throw new Error("SALON_ROOT_FETCH_FAILED")
        }

        setSalonRoot(normalizeSalonRoot(data))
      }catch(e){
        console.error("SALON_MONEY_ROOT_LOAD_FAILED", e)

        if(!cancelled){
          setSalonRoot(null)
          setRootError("Не удалось загрузить billing state")
        }
      }finally{
        if(!cancelled){
          setRootLoading(false)
        }
      }
    }

    loadSalonRoot()

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    let cancelled = false

    async function loadSettlements(){
      if(!slug){
        if(!cancelled){
          setSettlements([])
          setSettlementsLoading(false)
          setSettlementsError("Не найден salon slug")
        }
        return
      }

      try{
        setSettlementsLoading(true)
        setSettlementsError("")

        const response = await fetch(`${API_BASE}/internal/salons/${encodeURIComponent(slug)}/settlements`)
        const text = await response.text()

        if(cancelled) return

        const data = safeParse(text)
        if(!data || !response.ok){
          throw new Error("SETTLEMENTS_FETCH_FAILED")
        }

        setSettlements(normalizeSettlements(data))
      }catch(e){
        console.error("SALON_MONEY_SETTLEMENTS_LOAD_FAILED", e)

        if(!cancelled){
          setSettlements([])
          setSettlementsError("Не удалось загрузить сеты")
        }
      }finally{
        if(!cancelled){
          setSettlementsLoading(false)
        }
      }
    }

    loadSettlements()

    return () => {
      cancelled = true
    }
  }, [slug])

  const billingAccess = useMemo(() => getBillingAccess(salonRoot, contextBillingAccess), [salonRoot, contextBillingAccess])

  const lastSettlement = useMemo(() => {
    if(!Array.isArray(settlements) || settlements.length === 0) return null

    return [...settlements].sort((a, b) => {
      return new Date(b?.period_end || b?.created_at || 0) - new Date(a?.period_end || a?.created_at || 0)
    })[0]
  }, [settlements])

  const recentSettlements = useMemo(() => {
    return Array.isArray(settlements) ? settlements.slice(0, 3) : []
  }, [settlements])

  const loading = contextLoading || walletLoading || rootLoading
  const error = contextError || walletError || rootError

  if(loading){
    return <div style={styles.loading}>Загрузка...</div>
  }

  if(error){
    return <div style={styles.error}>Ошибка загрузки данных: {error}</div>
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerBlock}>
        <div style={styles.eyebrow}>SALON CABINET</div>
        <h3 style={styles.title}>Доход</h3>
        <div style={styles.subtitle}>Деньги сейчас: баланс, доступы и ближайший расчётный контур салона.</div>
      </div>

      {slug ? <FinanceNav slug={slug} active="money" /> : null}

      <div style={styles.grid}>
        <StatCard title="Баланс" value={money(wallet?.balance)} hint="Текущий wallet balance" />
        <StatCard
          title="Billing state"
          value={billingAccess?.access_state || billingAccess?.subscription_status || "—"}
          hint={`Write: ${accessLabel(typeof billingAccess?.can_write === "boolean" ? billingAccess?.can_write : canWrite)} · Withdraw: ${accessLabel(typeof billingAccess?.can_withdraw === "boolean" ? billingAccess?.can_withdraw : canWithdraw)}`}
        />
        <StatCard
          title="Последний сет"
          value={lastSettlement ? money(lastSettlement.amount) : "—"}
          hint={lastSettlement ? (lastSettlement.status || "—") : "Пока нет периодов"}
        />
        <StatCard title="Всего сетов" value={settlements.length} hint={settlementsError || "История расчетных периодов"} />
      </div>

      <Section title="Wallet summary" subtitle="Только текущая денежная поверхность без дубля finance hub">
        <Row label="Salon" value={identity?.name || identity?.title || slug || "—"} />
        <Row label="Slug" value={slug || "—"} />
        <Row label="Баланс" value={money(wallet?.balance)} />
        <Row label="Subscription status" value={billingAccess?.subscription_status || "—"} />
        <Row label="Access state" value={billingAccess?.access_state || "—"} />
        <Row label="Write access" value={accessLabel(typeof billingAccess?.can_write === "boolean" ? billingAccess?.can_write : canWrite)} />
        <Row label="Withdraw access" value={accessLabel(typeof billingAccess?.can_withdraw === "boolean" ? billingAccess?.can_withdraw : canWithdraw)} />
      </Section>

      <Section title="Последний расчетный период" subtitle="Без полной таблицы и без дублирующего центра">
        {lastSettlement ? (
          <>
            <Row label="Settlement ID" value={lastSettlement.id || "—"} />
            <Row label="Начало" value={formatDateTime(lastSettlement.period_start || lastSettlement.start_date)} />
            <Row label="Конец" value={formatDateTime(lastSettlement.period_end || lastSettlement.end_date)} />
            <Row label="Сумма" value={money(lastSettlement.amount)} />
            <Row label="Статус" value={lastSettlement.status || "—"} />
          </>
        ) : (
          <div style={styles.emptyText}>Расчетных периодов пока нет.</div>
        )}
      </Section>

      <Section title="Быстрые переходы" subtitle="Детали вынесены по ownership страниц">
        <div style={styles.linksGrid}>
          <Link to={buildSalonPath(slug, "settlements")} style={styles.linkCard}>Все сеты</Link>
          <Link to={buildSalonPath(slug, "payouts")} style={styles.linkCard}>Все выплаты</Link>
          <Link to={buildSalonPath(slug, "transactions")} style={styles.linkCard}>Все транзакции</Link>
          <Link to={buildSalonPath(slug, "contracts")} style={styles.linkCard}>Контракты мастеров</Link>
        </div>
      </Section>

      <Section title="Последние сеты" subtitle="Короткий preview вместо тяжёлого центра">
        {settlementsLoading ? (
          <div style={styles.emptyText}>Загрузка сетов...</div>
        ) : settlementsError ? (
          <div style={styles.errorInline}>{settlementsError}</div>
        ) : recentSettlements.length === 0 ? (
          <div style={styles.emptyText}>Сетов пока нет.</div>
        ) : (
          <div style={styles.list}>
            {recentSettlements.map((item, index) => (
              <div key={item?.id || index} style={styles.listCard}>
                <div style={styles.listTop}>
                  <strong>{item?.id || `Сет ${index + 1}`}</strong>
                  <span>{item?.status || "—"}</span>
                </div>
                <div style={styles.listMeta}>
                  {formatDateTime(item?.period_start || item?.start_date)} — {formatDateTime(item?.period_end || item?.end_date)}
                </div>
                <div style={styles.listAmount}>{money(item?.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

const styles = {
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
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "20px"
  },
  loading: {
    padding: "20px"
  },
  error: {
    margin: "20px",
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#991b1b",
    borderRadius: "12px",
    padding: "14px"
  },
  headerBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  eyebrow: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6b7280"
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "#111827"
  },
  subtitle: {
    color: "#6b7280",
    fontSize: "14px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px"
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px"
  },
  cardLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "8px"
  },
  cardValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#111827"
  },
  cardHint: {
    marginTop: "6px",
    color: "#6b7280",
    fontSize: "12px",
    lineHeight: 1.45
  },
  section: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "16px"
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827"
  },
  sectionSubtitle: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#6b7280"
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid #eef2f7"
  },
  rowLabel: {
    color: "#6b7280",
    fontSize: "14px"
  },
  rowValue: {
    textAlign: "right",
    color: "#111827",
    fontSize: "14px",
    fontWeight: 600,
    wordBreak: "break-word"
  },
  linksGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px"
  },
  linkCard: {
    display: "block",
    textDecoration: "none",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#111827",
    padding: "14px",
    fontWeight: 700
  },
  list: {
    display: "grid",
    gap: "10px"
  },
  listCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#f9fafb",
    padding: "14px"
  },
  listTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
    color: "#111827",
    fontSize: "14px"
  },
  listMeta: {
    marginTop: "8px",
    color: "#6b7280",
    fontSize: "12px",
    lineHeight: 1.45
  },
  listAmount: {
    marginTop: "10px",
    color: "#111827",
    fontSize: "16px",
    fontWeight: 800
  },
  emptyText: {
    color: "#6b7280",
    fontSize: "14px"
  },
  errorInline: {
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#991b1b",
    borderRadius: "12px",
    padding: "12px",
    fontSize: "14px"
  }
}
