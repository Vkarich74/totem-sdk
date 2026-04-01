import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.API_BASE ||
  "https://api.totemv.com"

function money(value){
  return new Intl.NumberFormat("ru-RU").format(Number(value) || 0) + " сом"
}

function formatDateTime(value){
  if(!value) return "—"

  const date = new Date(value)

  if(Number.isNaN(date.getTime())){
    return "—"
  }

  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function normalizeList(payload, keys){
  if(Array.isArray(payload)) return payload

  for(const key of keys){
    if(Array.isArray(payload?.[key])) return payload[key]
    if(Array.isArray(payload?.data?.[key])) return payload.data[key]
  }

  return []
}

function normalizeMetrics(payload){
  if(payload?.metrics) return payload.metrics
  if(payload?.data?.metrics) return payload.data.metrics
  if(payload && typeof payload === "object") return payload
  return {}
}

function normalizeWallet(payload){
  if(typeof payload?.balance !== "undefined") return Number(payload.balance) || 0
  if(typeof payload?.data?.balance !== "undefined") return Number(payload.data.balance) || 0
  return 0
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
    note: "Финансовый модуль работает без ограничений"
  }
}

function getContractStatusLabel(value){
  const status = String(value || "").toLowerCase()
  if(status === "active") return "Активный"
  if(status === "pending") return "Ожидает"
  if(status === "archived") return "Архивный"
  return value || "—"
}

function getPayoutStatusLabel(value){
  const status = String(value || "").toLowerCase()
  if(status === "paid") return "Выплачен"
  if(status === "pending") return "Ожидает"
  if(status === "failed") return "Ошибка"
  return value || "—"
}

function getSettlementStatusLabel(value){
  const status = String(value || "").toLowerCase()
  if(status === "open") return "Открыт"
  if(status === "closed") return "Закрыт"
  if(status === "pending") return "Ожидает"
  return value || "—"
}

function SectionTitle({ title, note }){
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{title}</div>
      {note ? (
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, lineHeight: 1.45 }}>{note}</div>
      ) : null}
    </div>
  )
}

function Panel({ children }){
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      background: "#ffffff",
      padding: 16,
      boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
    }}>
      {children}
    </div>
  )
}

function StatCard({ title, value, note }){
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      background: "#ffffff",
      padding: 16,
      minHeight: 118
    }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>{value}</div>
      {note ? (
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8, lineHeight: 1.45 }}>{note}</div>
      ) : null}
    </div>
  )
}

function FinanceNavCard({ to, title, note, active = false }){
  return (
    <Link
      to={to}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        border: `1px solid ${active ? "#dbeafe" : "#e5e7eb"}`,
        borderRadius: 14,
        background: active ? "#eff6ff" : "#ffffff",
        padding: 14
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: active ? "#1d4ed8" : "#111827", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}>{note}</div>
    </Link>
  )
}

function EmptyState({ text }){
  return (
    <div style={{
      border: "1px dashed #d1d5db",
      borderRadius: 14,
      background: "#f9fafb",
      padding: 16,
      color: "#6b7280",
      fontSize: 14
    }}>
      {text}
    </div>
  )
}

function PreviewRow({ title, meta, value, status }){
  return (
    <div style={{
      borderTop: "1px solid #eef2f7",
      paddingTop: 12,
      marginTop: 12,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap"
    }}>
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{title}</div>
        {meta ? (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.4 }}>{meta}</div>
        ) : null}
      </div>

      <div style={{ textAlign: "right" }}>
        {typeof value !== "undefined" ? (
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{value}</div>
        ) : null}
        {status ? (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{status}</div>
        ) : null}
      </div>
    </div>
  )
}

export default function SalonFinancePage(){
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)

  const {
    billingAccess,
    canWrite,
    canWithdraw,
    billingBlockReason,
    loading: contextLoading,
    error: contextError
  } = useSalonContext()

  const [metrics, setMetrics] = useState({})
  const [walletBalance, setWalletBalance] = useState(0)
  const [contracts, setContracts] = useState([])
  const [settlements, setSettlements] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadFinance(){
      if(!slug){
        if(!cancelled){
          setMetrics({})
          setWalletBalance(0)
          setContracts([])
          setSettlements([])
          setPayouts([])
          setError("SLUG_MISSING")
          setLoading(false)
        }
        return
      }

      try{
        setLoading(true)
        setError("")

        const [
          metricsRes,
          walletRes,
          contractsRes,
          settlementsRes,
          payoutsRes
        ] = await Promise.allSettled([
          fetch(`${API_BASE}/internal/salons/${slug}/metrics`),
          fetch(`${API_BASE}/internal/salons/${slug}/wallet-balance`),
          fetch(`${API_BASE}/internal/salons/${slug}/contracts`),
          fetch(`${API_BASE}/internal/salons/${slug}/settlements`),
          fetch(`${API_BASE}/internal/salons/${slug}/payouts`)
        ])

        async function parseResult(result, fallback){
          if(result.status !== "fulfilled") return fallback
          const response = result.value
          if(!response.ok) return fallback
          try{
            return await response.json()
          }catch{
            return fallback
          }
        }

        const [metricsRaw, walletRaw, contractsRaw, settlementsRaw, payoutsRaw] = await Promise.all([
          parseResult(metricsRes, {}),
          parseResult(walletRes, {}),
          parseResult(contractsRes, {}),
          parseResult(settlementsRes, {}),
          parseResult(payoutsRes, {})
        ])

        if(cancelled) return

        setMetrics(normalizeMetrics(metricsRaw))
        setWalletBalance(normalizeWallet(walletRaw))
        setContracts(normalizeList(contractsRaw, ["contracts", "items"]))
        setSettlements(normalizeList(settlementsRaw, ["settlements", "periods", "items"]))
        setPayouts(normalizeList(payoutsRaw, ["payouts", "items"]))
      }catch(loadError){
        console.error("SALON FINANCE LOAD ERROR", loadError)

        if(!cancelled){
          setMetrics({})
          setWalletBalance(0)
          setContracts([])
          setSettlements([])
          setPayouts([])
          setError(loadError?.message || "SALON_FINANCE_LOAD_FAILED")
        }
      }finally{
        if(!cancelled){
          setLoading(false)
        }
      }
    }

    loadFinance()

    return () => {
      cancelled = true
    }
  }, [slug])

  const billingUi = useMemo(
    () => getBillingUi(billingAccess, billingBlockReason),
    [billingAccess, billingBlockReason]
  )

  const activeContracts = useMemo(
    () => contracts.filter((item) => String(item?.status || "").toLowerCase() === "active"),
    [contracts]
  )

  const recentSettlements = useMemo(() => {
    return [...settlements]
      .sort((a, b) => {
        const aTime = new Date(a?.period_end || a?.created_at || 0).getTime() || 0
        const bTime = new Date(b?.period_end || b?.created_at || 0).getTime() || 0
        return bTime - aTime
      })
      .slice(0, 3)
  }, [settlements])

  const recentPayouts = useMemo(() => {
    return [...payouts]
      .sort((a, b) => {
        const aTime = new Date(a?.created_at || a?.paid_at || 0).getTime() || 0
        const bTime = new Date(b?.created_at || b?.paid_at || 0).getTime() || 0
        return bTime - aTime
      })
      .slice(0, 3)
  }, [payouts])

  const metricsView = {
    revenueToday: Number(metrics?.revenue_today || 0),
    revenueMonth: Number(metrics?.revenue_month || 0),
    paymentsTotal: Number(metrics?.payments_total || 0),
    bookingsToday: Number(metrics?.bookings_today || 0)
  }

  const pageLoading = contextLoading || loading
  const pageError = contextError || error
  const showEmpty = !pageLoading && !pageError && !contracts.length && !settlements.length && !payouts.length && !walletBalance && !metricsView.revenueMonth

  if(pageError){
    return (
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>Финансы салона</div>
        <div style={{
          marginTop: 12,
          border: "1px solid #f5c2c7",
          background: "#fff5f5",
          color: "#b42318",
          borderRadius: 12,
          padding: 14
        }}>
          Ошибка загрузки финансового модуля
        </div>
      </div>
    )
  }

  if(pageLoading){
    return (
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>Финансы салона</div>
        <div style={{ marginTop: 12, color: "#6b7280" }}>Загрузка финансового обзора...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, background: "#f6f7fb", minHeight: "100%" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>Финансы салона</div>
          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 6, lineHeight: 1.5 }}>
            Центральный обзор денег, доступа и переходов в расчёты, выплаты, транзакции и договоры.
          </div>
        </div>

        <div style={{
          border: `1px solid ${billingUi.border}`,
          background: billingUi.bg,
          color: billingUi.tone,
          borderRadius: 14,
          padding: 14,
          marginBottom: 16
        }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{billingUi.title}</div>
          <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>{billingUi.note}</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: 13 }}>
            <span>Запись: {canWrite ? "разрешена" : "ограничена"}</span>
            <span>Вывод: {canWithdraw ? "разрешён" : "ограничен"}</span>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 18
        }}>
          <StatCard title="Баланс кошелька" value={money(walletBalance)} note="Текущий wallet balance салона" />
          <StatCard title="Доход сегодня" value={money(metricsView.revenueToday)} note="Операционная выручка за день" />
          <StatCard title="Доход за месяц" value={money(metricsView.revenueMonth)} note="Главный срез по текущей выручке" />
          <StatCard title="Активные контракты" value={String(activeContracts.length)} note="Связка с мастерами и правила расчётов" />
        </div>

        <Panel>
          <SectionTitle title="Финансовая навигация" note="Финансы — это overview, а глубокие действия находятся на отдельных страницах." />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12
          }}>
            <FinanceNavCard to={buildSalonPath(slug, "finance")} title="Финансы" note="Общий обзор" active />
            <FinanceNavCard to={buildSalonPath(slug, "money")} title="Доход" note="Деньги сейчас" />
            <FinanceNavCard to={buildSalonPath(slug, "settlements")} title="Сеты" note="Расчётные периоды" />
            <FinanceNavCard to={buildSalonPath(slug, "payouts")} title="Выплаты" note="Фактические выплаты" />
            <FinanceNavCard to={buildSalonPath(slug, "transactions")} title="Транзакции" note="Техническая лента" />
            <FinanceNavCard to={buildSalonPath(slug, "contracts")} title="Контракты" note="Договорный модуль" />
          </div>
        </Panel>

        {showEmpty ? (
          <div style={{ marginTop: 18 }}>
            <EmptyState text="Финансовые данные пока не наполнены. Как только появятся движения денег, контракты или расчётные периоды, обзор заполнится автоматически." />
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
            marginTop: 18
          }}>
            <Panel>
              <SectionTitle title="Контрактный статус" note="Здесь только краткий обзор. Полная работа с договорами остаётся на странице контрактов." />
              {activeContracts.length === 0 ? (
                <EmptyState text="Активных контрактов пока нет." />
              ) : (
                activeContracts.slice(0, 3).map((contract, index) => (
                  <PreviewRow
                    key={contract?.id || index}
                    title={contract?.master_name || contract?.master_slug || contract?.master_id || "Мастер"}
                    meta={contract?.billing_model || contract?.contract_type || "Условия заданы в контракте"}
                    value={money(contract?.amount || 0)}
                    status={getContractStatusLabel(contract?.status)}
                  />
                ))
              )}
              <div style={{ marginTop: 14 }}>
                <Link to={buildSalonPath(slug, "contracts")} style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", textDecoration: "none" }}>
                  Открыть все контракты →
                </Link>
              </div>
            </Panel>

            <Panel>
              <SectionTitle title="Последние расчётные периоды" note="Компактный preview без перегрузки overview-страницы." />
              {recentSettlements.length === 0 ? (
                <EmptyState text="Расчётные периоды пока не сформированы." />
              ) : (
                recentSettlements.map((settlement, index) => (
                  <PreviewRow
                    key={settlement?.id || index}
                    title={`Период ${formatDateTime(settlement?.period_start)} — ${formatDateTime(settlement?.period_end)}`}
                    meta={settlement?.closed_at ? `Закрыт: ${formatDateTime(settlement.closed_at)}` : "Период ещё открыт"}
                    value={money(settlement?.amount || settlement?.total_amount || 0)}
                    status={getSettlementStatusLabel(settlement?.status)}
                  />
                ))
              )}
              <div style={{ marginTop: 14 }}>
                <Link to={buildSalonPath(slug, "settlements")} style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", textDecoration: "none" }}>
                  Открыть все сеты →
                </Link>
              </div>
            </Panel>

            <Panel>
              <SectionTitle title="Последние выплаты" note="Здесь только краткая лента. Полная история и статусы — на странице выплат." />
              {recentPayouts.length === 0 ? (
                <EmptyState text="Выплат пока нет." />
              ) : (
                recentPayouts.map((payout, index) => (
                  <PreviewRow
                    key={payout?.id || index}
                    title={payout?.destination || payout?.reference || payout?.reference_id || "Выплата"}
                    meta={formatDateTime(payout?.paid_at || payout?.created_at)}
                    value={money(payout?.amount || 0)}
                    status={getPayoutStatusLabel(payout?.status)}
                  />
                ))
              )}
              <div style={{ marginTop: 14 }}>
                <Link to={buildSalonPath(slug, "payouts")} style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", textDecoration: "none" }}>
                  Открыть все выплаты →
                </Link>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}
