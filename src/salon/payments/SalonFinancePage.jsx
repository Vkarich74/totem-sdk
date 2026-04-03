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
  if(status === "paid" || status === "completed") return "Выплачено"
  if(status === "pending") return "Ожидает"
  if(status === "processing") return "Обрабатывается"
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
        padding: 14,
        minWidth: 0,
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: active ? "#1d4ed8" : "#111827", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.45 }}>{note}</div>
    </Link>
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

function StatCard({ title, value, note }){
  return (
    <article style={styles.statCard}>
      <div style={styles.statLabel}>{title}</div>
      <div style={styles.statValue}>{value}</div>
      {note ? <div style={styles.statNote}>{note}</div> : null}
    </article>
  )
}

function EmptyState({ title, text }){
  return (
    <div style={styles.emptyBox}>
      <h3 style={styles.emptyTitle}>{title}</h3>
      <p style={styles.emptyText}>{text}</p>
    </div>
  )
}

function PreviewRow({ title, meta, value, status }){
  return (
    <article style={styles.previewRow}>
      <div style={{ minWidth: 0, flex: "1 1 240px" }}>
        <h3 style={styles.previewTitle}>{title}</h3>
        {meta ? <p style={styles.previewMeta}>{meta}</p> : null}
      </div>

      <div style={styles.previewAside}>
        {typeof value !== "undefined" ? <div style={styles.previewValue}>{value}</div> : null}
        {status ? <div style={styles.previewStatus}>{status}</div> : null}
      </div>
    </article>
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
  const pageError = !pageLoading && (contextError || error)
  const showEmpty = !pageLoading && !pageError && !contracts.length && !settlements.length && !payouts.length && !walletBalance && !metricsView.revenueMonth

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {slug ? (
          <nav aria-label="Финансовые разделы" style={styles.navGrid}>
            <FinanceNavCard to={buildSalonPath(slug, "finance")} title="Финансы" note="Общий обзор" active />
            <FinanceNavCard to={buildSalonPath(slug, "money")} title="Доход" note="Деньги сейчас" />
            <FinanceNavCard to={buildSalonPath(slug, "settlements")} title="Сеты" note="Расчётные периоды" />
            <FinanceNavCard to={buildSalonPath(slug, "payouts")} title="Выплаты" note="Фактические выплаты" />
            <FinanceNavCard to={buildSalonPath(slug, "transactions")} title="Транзакции" note="Техническая лента" />
            <FinanceNavCard to={buildSalonPath(slug, "contracts")} title="Контракты" note="Договорный модуль" />
          </nav>
        ) : null}

        <header style={styles.pageHeader}>
          <p style={styles.eyebrow}>Salon finance / mobile</p>
          <h1 style={styles.pageTitle}>Финансы салона</h1>
          <p style={styles.pageSubtitle}>
            Центральный обзор денег, доступа и переходов в расчёты, выплаты, транзакции и договоры. Верхний слой страницы стабилен для mobile-first использования.
          </p>
        </header>

        <section
          style={{
            ...styles.alert,
            borderColor: billingUi.border,
            background: billingUi.bg,
            color: billingUi.tone
          }}
        >
          <div style={styles.alertMain}>
            <h2 style={{ ...styles.alertTitle, color: billingUi.tone }}>{billingUi.title}</h2>
            <p style={styles.alertText}>{billingUi.note}</p>
          </div>
          <div style={styles.alertMeta}>
            <div>Запись: {canWrite ? "разрешена" : "ограничена"}</div>
            <div>Вывод: {canWithdraw ? "разрешён" : "ограничен"}</div>
          </div>
        </section>

        <section style={styles.statsGrid}>
          <StatCard title="Баланс кошелька" value={money(walletBalance)} note="Текущий wallet balance салона" />
          <StatCard title="Доход сегодня" value={money(metricsView.revenueToday)} note="Операционная выручка за день" />
          <StatCard title="Доход за месяц" value={money(metricsView.revenueMonth)} note="Главный срез по текущей выручке" />
          <StatCard title="Активные контракты" value={String(activeContracts.length)} note="Связка с мастерами и правила расчётов" />
        </section>

        <div style={styles.mainStack}>
          <Panel
            title="Короткий статус модуля"
            note="Overview держит единый каркас: header, billing, summary и компактные превью дочерних финансовых разделов."
          >
            {pageLoading ? <div style={styles.infoText}>Загрузка финансового обзора...</div> : null}

            {pageError ? (
              <EmptyState
                title={contextError ? "Ошибка shell-слоя" : "Ошибка загрузки"}
                text={contextError ? "Не удалось определить состояние кабинета салона" : "Не удалось загрузить финансовый модуль"}
              />
            ) : null}

            {showEmpty ? (
              <EmptyState
                title="Финансовые данные пока не наполнены"
                text="Как только появятся движения денег, контракты или расчётные периоды, обзор заполнится автоматически. Каркас страницы уже готов под production mobile UI."
              />
            ) : null}

            {!pageLoading && !pageError && !showEmpty ? (
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Платежей всего</div>
                  <div style={styles.infoValue}>{metricsView.paymentsTotal}</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Записей сегодня</div>
                  <div style={styles.infoValue}>{metricsView.bookingsToday}</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Сетов</div>
                  <div style={styles.infoValue}>{settlements.length}</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Выплат</div>
                  <div style={styles.infoValue}>{payouts.length}</div>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel
            title="Финансовая навигация"
            note="Обзор остаётся главным экраном, а глубокие действия вынесены на отдельные finance-страницы с тем же мобильным контрактом."
          >
            {slug ? (
              <div style={styles.navOverviewGrid}>
                <FinanceNavCard to={buildSalonPath(slug, "finance")} title="Финансы" note="Общий обзор" active />
                <FinanceNavCard to={buildSalonPath(slug, "money")} title="Доход" note="Деньги сейчас" />
                <FinanceNavCard to={buildSalonPath(slug, "settlements")} title="Сеты" note="Расчётные периоды" />
                <FinanceNavCard to={buildSalonPath(slug, "payouts")} title="Выплаты" note="Фактические выплаты" />
                <FinanceNavCard to={buildSalonPath(slug, "transactions")} title="Транзакции" note="Техническая лента" />
                <FinanceNavCard to={buildSalonPath(slug, "contracts")} title="Контракты" note="Договорный модуль" />
              </div>
            ) : (
              <EmptyState title="Навигация недоступна" text="Не найден salon slug для переходов между финансовыми разделами." />
            )}
          </Panel>

          {!pageLoading && !pageError && !showEmpty ? (
            <div style={styles.previewGrid}>
              <Panel title="Контрактный статус" note="Здесь только краткий обзор. Полная работа с договорами остаётся на странице контрактов.">
                {activeContracts.length === 0 ? (
                  <EmptyState title="Активных контрактов пока нет" text="Когда появятся рабочие договоры с мастерами, блок заполнится автоматически." />
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
                <div style={styles.linkRow}>
                  <Link to={buildSalonPath(slug, "contracts")} style={styles.inlineLink}>
                    Открыть все контракты →
                  </Link>
                </div>
              </Panel>

              <Panel title="Последние расчётные периоды" note="Компактный preview без перегрузки overview-страницы.">
                {recentSettlements.length === 0 ? (
                  <EmptyState title="Расчётные периоды пока не сформированы" text="Сеты появятся после накопления транзакций и закрытия операций." />
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
                <div style={styles.linkRow}>
                  <Link to={buildSalonPath(slug, "settlements")} style={styles.inlineLink}>
                    Открыть все сеты →
                  </Link>
                </div>
              </Panel>

              <Panel title="Последние выплаты" note="Здесь только краткая лента. Полная история и статусы — на странице выплат.">
                {recentPayouts.length === 0 ? (
                  <EmptyState title="Выплат пока нет" text="Блок автоматически наполнится после появления payout-записей." />
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
                <div style={styles.linkRow}>
                  <Link to={buildSalonPath(slug, "payouts")} style={styles.inlineLink}>
                    Открыть все выплаты →
                  </Link>
                </div>
              </Panel>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: 14,
    background: "#f8fafc",
    minHeight: "100%"
  },
  container: {
    maxWidth: 980,
    margin: "0 auto"
  },
  navGrid: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 4,
    marginBottom: 16,
    scrollbarWidth: "thin"
  },
  pageHeader: {
    marginBottom: 16
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    fontWeight: 700,
    color: "#475467",
    textTransform: "uppercase",
    letterSpacing: "0.04em"
  },
  pageTitle: {
    margin: "6px 0 0",
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 800,
    color: "#111827"
  },
  pageSubtitle: {
    margin: "8px 0 0",
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.55
  },
  alert: {
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16
  },
  alertMain: {
    minWidth: 0,
    flex: "1 1 240px"
  },
  alertTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800
  },
  alertText: {
    margin: "4px 0 0",
    fontSize: 13,
    lineHeight: 1.45,
    color: "#475467"
  },
  alertMeta: {
    fontSize: 12,
    lineHeight: 1.6,
    textAlign: "right",
    color: "#475467"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
    marginBottom: 16
  },
  statCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#ffffff",
    padding: 14,
    minHeight: 116
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: 800,
    color: "#111827"
  },
  statNote: {
    marginTop: 8,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.45
  },
  mainStack: {
    display: "grid",
    gap: 14
  },
  panel: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#ffffff",
    padding: 16,
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)"
  },
  sectionHeader: {
    display: "grid",
    gap: 6
  },
  panelTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#111827"
  },
  panelNote: {
    margin: 0,
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5
  },
  infoText: {
    fontSize: 14,
    color: "#6b7280"
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12
  },
  infoItem: {
    borderTop: "1px solid #eef2f7",
    paddingTop: 12
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.45
  },
  emptyBox: {
    border: "1px dashed #d1d5db",
    borderRadius: 14,
    background: "#f9fafb",
    padding: 16
  },
  emptyTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#111827"
  },
  emptyText: {
    margin: "6px 0 0",
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.5
  },
  navOverviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14
  },
  previewRow: {
    borderTop: "1px solid #eef2f7",
    paddingTop: 12,
    marginTop: 12,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap"
  },
  previewTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#111827"
  },
  previewMeta: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.4
  },
  previewAside: {
    textAlign: "right"
  },
  previewValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827"
  },
  previewStatus: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4
  },
  linkRow: {
    marginTop: 14
  },
  inlineLink: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1d4ed8",
    textDecoration: "none"
  }
}
