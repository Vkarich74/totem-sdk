import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"
import { getMoneyCoreDestinationProviders, getMoneyCoreFlags, getSalonContracts, getSalonLostProfit, getSalonMetrics, getSalonMoneyCoreSummary, getSalonPaymentProjections, getSalonPayouts, getSalonSettlements, getSalonWalletBalance, getSalonWithdrawDestinations, getSalonWithdrawRequests, getSalonWithdrawSettings } from "../../api/internal"

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
  const [moneyCoreSummary, setMoneyCoreSummary] = useState(null)
  const [paymentProjectionSummary, setPaymentProjectionSummary] = useState(null)
  const [lostProfit, setLostProfit] = useState(null)
  const [lostProfitLoading, setLostProfitLoading] = useState(true)
  const [lostProfitError, setLostProfitError] = useState("")
  const [moneyCoreFlags, setMoneyCoreFlags] = useState(null)
  const [moneyCoreDestinationProviders, setMoneyCoreDestinationProviders] = useState([])
  const [moneyCoreWithdrawDestinations, setMoneyCoreWithdrawDestinations] = useState([])
  const [moneyCoreWithdrawSettings, setMoneyCoreWithdrawSettings] = useState(null)
  const [moneyCoreWithdrawRequests, setMoneyCoreWithdrawRequests] = useState([])
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
          setPaymentProjectionSummary(null)
          setError("SLUG_MISSING")
          setLoading(false)
        }
        return
      }

      try{
        setLoading(true)
        setError("")

        const [
          metricsRaw,
          walletRaw,
          contractsRaw,
          settlementsRaw,
          payoutsRaw,
          paymentProjectionRaw,
          moneyCoreRaw,
          moneyCoreFlagsRaw
        ] = await Promise.all([
          getSalonMetrics(slug),
          getSalonWalletBalance(slug),
          getSalonContracts(slug),
          getSalonSettlements(slug),
          getSalonPayouts(slug),
          getSalonPaymentProjections(slug),
          getSalonMoneyCoreSummary(slug),
          getMoneyCoreFlags()
        ])

        if(cancelled) return

        setMetrics(normalizeMetrics(metricsRaw?.ok ? metricsRaw : {}))
        setWalletBalance(normalizeWallet(walletRaw?.ok ? walletRaw.wallet : {}))
        setContracts(normalizeList(contractsRaw?.ok ? { contracts: contractsRaw.contracts } : {}, ["contracts", "items"]))
        setSettlements(normalizeList(settlementsRaw?.ok ? { settlements: settlementsRaw.settlements } : {}, ["settlements", "periods", "items"]))
        setPayouts(normalizeList(payoutsRaw?.ok ? { payouts: payoutsRaw.payouts } : {}, ["payouts", "items"]))
        setPaymentProjectionSummary(paymentProjectionRaw?.ok ? paymentProjectionRaw.summary : null)
        setMoneyCoreSummary((moneyCoreRaw?.ok ? moneyCoreRaw.summary : null) || moneyCoreRaw?.data || moneyCoreRaw || null)
        setMoneyCoreFlags((moneyCoreFlagsRaw?.ok ? moneyCoreFlagsRaw.flags : null) || moneyCoreFlagsRaw?.data || moneyCoreFlagsRaw || null)
      }catch(loadError){
        console.error("SALON FINANCE LOAD ERROR", loadError)

        if(!cancelled){
          setMetrics({})
          setWalletBalance(0)
          setContracts([])
          setSettlements([])
          setPayouts([])
          setPaymentProjectionSummary(null)
          setMoneyCoreSummary(null)
          setMoneyCoreFlags(null)
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

  useEffect(() => {
    let cancelled = false

    async function loadLostProfit(){
      if(!slug){
        if(!cancelled){
          setLostProfit(null)
          setLostProfitLoading(false)
          setLostProfitError("")
        }
        return
      }

      try{
        setLostProfitLoading(true)
        setLostProfitError("")

        const result = await getSalonLostProfit(undefined, { limit: 50 })

        if(cancelled) return

        if(result?.ok){
          setLostProfit(result.result || null)
        }else{
          setLostProfit(null)
          setLostProfitError("Недополученная прибыль временно недоступна")
        }
      }catch(error){
        console.error("SALON_LOST_PROFIT_LOAD_ERROR", error)

        if(!cancelled){
          setLostProfit(null)
          setLostProfitError("Недополученная прибыль временно недоступна")
        }
      }finally{
        if(!cancelled){
          setLostProfitLoading(false)
        }
      }
    }

    void loadLostProfit()

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    let cancelled = false

    async function loadMoneyCoreCabinet(){
      const ownerSlug = slug

      if(!ownerSlug){
        if(!cancelled){
          setMoneyCoreDestinationProviders([])
          setMoneyCoreWithdrawDestinations([])
          setMoneyCoreWithdrawSettings(null)
          setMoneyCoreWithdrawRequests([])
        }
        return
      }

      try{
        const [
          providersRaw,
          destinationsRaw,
          settingsRaw,
          requestsRaw
        ] = await Promise.all([
          getMoneyCoreDestinationProviders({ enabled: true }),
          getSalonWithdrawDestinations(ownerSlug),
          getSalonWithdrawSettings(ownerSlug),
          getSalonWithdrawRequests(ownerSlug, { limit: 10, offset: 0 })
        ])

        if(cancelled) return

        setMoneyCoreDestinationProviders(Array.isArray(providersRaw?.providers) ? providersRaw.providers : [])
        setMoneyCoreWithdrawDestinations(Array.isArray(destinationsRaw?.destinations) ? destinationsRaw.destinations : [])
        setMoneyCoreWithdrawSettings(settingsRaw?.settings || null)
        setMoneyCoreWithdrawRequests(Array.isArray(requestsRaw?.requests) ? requestsRaw.requests : [])
      }catch(e){
        if(!cancelled){
          setMoneyCoreDestinationProviders([])
          setMoneyCoreWithdrawDestinations([])
          setMoneyCoreWithdrawSettings(null)
          setMoneyCoreWithdrawRequests([])
        }
      }
    }

    loadMoneyCoreCabinet()

    return () => {
      cancelled = true
    }
  }, [moneyCoreSummary?.owner?.type, moneyCoreSummary?.owner?.id])

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

  const lostProfitSummary = lostProfit?.summary || null
  const lostProfitByMaster = Array.isArray(lostProfit?.by_master) ? lostProfit.by_master : []
  const lostProfitMonthly = Array.isArray(lostProfit?.monthly) ? lostProfit.monthly : []

  const pageLoading = contextLoading || loading
  const pageError = !pageLoading && (contextError || error)
  const showEmpty = !pageLoading && !pageError && !contracts.length && !settlements.length && !payouts.length && !walletBalance && !Number(paymentProjectionSummary?.history_amount || 0)
  const moneyCoreZones = moneyCoreSummary || {}
  const moneyCoreFlagsData = moneyCoreFlags?.flags || moneyCoreFlags?.data || moneyCoreFlags || null
  const moneyCoreOpen = Boolean(
    moneyCoreFlagsData &&
    moneyCoreFlagsData.MONEY_CORE_ENABLED === true &&
    moneyCoreFlagsData.MONEY_CORE_READ_ONLY === false &&
    moneyCoreFlagsData.MONEY_CORE_WRITE_ENABLED === true &&
    moneyCoreFlagsData.WITHDRAW_REQUESTS_V2_ENABLED === true
  )
  const moneyCoreWithdrawPanelNote = moneyCoreOpen
    ? "Текущий режим Money Core"
    : "Текущий режим Money Core без возможности записи"
  const moneyCoreWithdrawStateText = moneyCoreOpen
    ? "Money Core включён. Вывод работает в рабочем режиме."
    : "Заявки на вывод через Money Core пока выключены. Деньги нельзя вывести напрямую до включения write-флагов."
  const moneyCoreWithdrawSettingsText = moneyCoreOpen
    ? "Money Core включён. Используется текущая конфигурация вывода."
    : "Пока используется дефолтная только просмотр конфигурация."
  const moneyCoreWithdrawRequestsText = moneyCoreOpen
    ? "История выводов появится после первых операций Money Core."
    : "История выводов появится после включения write-флагов."
  const moneyCoreCreateRequestText = moneyCoreOpen
    ? "Создание заявки доступно в рабочем режиме Money Core."
    : "Создание заявки будет доступно после controlled write-smoke и включения Money Core write-флагов."
  const moneyCoreAddRequisitesText = moneyCoreOpen
    ? "Добавление реквизитов доступно в рабочем режиме Money Core."
    : "Добавление реквизитов будет доступно после включения Money Core write-флагов."

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {slug ? (
          <nav aria-label="Финансовые разделы" style={styles.navGrid}>
            <FinanceNavCard to={buildSalonPath(slug, "finance")} title="Финансы" note="Общий обзор" active />
            <FinanceNavCard to={buildSalonPath(slug, "money")} title="Кошелёк и вывод" note="Баланс, расчёты и вывод" />
            <FinanceNavCard to={buildSalonPath(slug, "settlements")} title="Сеты" note="Расчётные периоды" />
            <FinanceNavCard to={buildSalonPath(slug, "payouts")} title="Выплаты" note="Фактические выплаты" />
            <FinanceNavCard to={buildSalonPath(slug, "transactions")} title="Транзакции" note="История операций" />
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
          <StatCard title="Доход сегодня" value={money(paymentProjectionSummary?.history_amount)} note="Операционная выручка за день" />
          <StatCard title="Доход за месяц" value={money(paymentProjectionSummary?.history_amount)} note="Главный срез по текущей выручке" />
          <StatCard title="Активные контракты" value={String(activeContracts.length)} note="Связка с мастерами и правила расчётов" />
          <StatCard title="История оплат" value={money(paymentProjectionSummary?.history_amount)} note={`Строк в истории: ${Number(paymentProjectionSummary?.history_count || 0)}`} />
          <StatCard title="Открытый баланс" value={money(paymentProjectionSummary?.open_balance_amount)} note={`Открытых строк: ${Number(paymentProjectionSummary?.open_balance_count || 0)}`} />
        </section>

        <Panel
          title="Недополученная прибыль"
          note="Аналитика отменённых записей. Не влияет на баланс, выплаты и договоры."
        >
          {lostProfitError ? (
            <div style={{ marginBottom: 12, fontSize: 13, color: "#b42318", background: "#fff5f5", border: "1px solid #f5c2c7", borderRadius: 12, padding: 12 }}>
              {lostProfitError}
            </div>
          ) : null}

          {lostProfitLoading ? (
            <EmptyState
              title="Недополученная прибыль загружается"
              text="Считаем отменённые записи и суммы по мастерам."
            />
          ) : lostProfitSummary ? (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={styles.statsGrid}>
                <StatCard title="Сумма" value={money(lostProfitSummary.lost_profit_amount)} note="Недополученная прибыль" />
                <StatCard title="Отменённые записи" value={String(Number(lostProfitSummary.cancelled_count || 0))} note="Записи в выборке" />
                {Number(lostProfitSummary.missing_price_count || 0) > 0 ? (
                  <StatCard title="Без цены" value={String(Number(lostProfitSummary.missing_price_count || 0))} note="Записи без price_snapshot" />
                ) : null}
              </div>

              {lostProfitByMaster.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Breakdown по мастерам</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {lostProfitByMaster.map((item) => (
                      <PreviewRow
                        key={`${item.master_id}-${item.master_slug || "master"}`}
                        title={item.master_name || item.master_slug || `Мастер #${item.master_id}`}
                        meta={`${item.master_slug || "—"} · ${Number(item.cancelled_count || 0)} записей`}
                        value={money(item.lost_profit_amount)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {lostProfitMonthly.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>История по месяцам</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {lostProfitMonthly.map((item) => (
                      <PreviewRow
                        key={item.month}
                        title={item.month || "—"}
                        meta={`${Number(item.cancelled_count || 0)} отменённых записей`}
                        value={money(item.lost_profit_amount)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="Недополученная прибыль пока не найдена"
              text="Для выбранного периода нет отменённых записей."
            />
          )}
        </Panel>

            <Panel
              title="Money Core: баланс и вывод"
              note={moneyCoreOpen ? "Money Core включён" : "Новая модель вывода средств. Сейчас доступен только просмотр."}
            >
          {moneyCoreOpen ? (
            <div style={{ marginBottom: 12, color: "#065f46", background: "#ecfdf3", border: "1px solid #abefc6", borderRadius: 12, padding: 12 }}>
              Money Core включён. Вывод работает в режиме записи.
            </div>
          ) : (
            <div style={{ marginBottom: 12, color: "#92400e", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 12 }}>
              Заявки на вывод через Money Core пока выключены. Деньги нельзя вывести напрямую до включения write-флагов.
            </div>
          )}

          {moneyCoreSummary ? (
            <div style={styles.statsGrid}>
              <StatCard title="Резерв у провайдера" value={money(moneyCoreZones.provider_hold)} note="Резерв у провайдера" />
              <StatCard title="Ожидает расчёта" value={money(moneyCoreZones.pending_settlement)} note="Ожидает расчёта" />
              <StatCard title="available" value={money(moneyCoreZones.available)} note="Доступно к выводу" />
              <StatCard title="locked" value={money(moneyCoreZones.locked)} note="Заблокировано под выплаты" />
              <StatCard title="paid_out" value={money(moneyCoreZones.paid_out)} note="Уже выплачено" />
              <StatCard title="Возвраты" value={money(moneyCoreZones.refunded)} note="Возвраты" />
              <StatCard title="Отменённые операции" value={money(moneyCoreZones.reversed)} note="Отмены" />
              <StatCard title="Требует проверки" value={money(moneyCoreZones.requires_review)} note="Требует проверки" />
              <StatCard title="Комиссия сервиса" value={money(moneyCoreZones.commission)} note="Комиссия" />
              <StatCard title="Резерв комиссии" value={money(moneyCoreZones.fee_reserved)} note="Резерв комиссии" />
            </div>
              ) : (
                <EmptyState
                  title="Money Core баланс пока не сформирован"
                  text="Доступный вывод появится после подтверждённого settlement."
                />
              )}

              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <Panel title="Способы вывода" note="Доступные провайдеры вывода для Money Core">
                  {moneyCoreDestinationProviders.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {moneyCoreDestinationProviders.map((item) => (
                        <PreviewRow
                          key={item.code}
                          title={item.name || item.code}
                          meta={`${item.code} · ${item.method || "—"}`}
                          status={item.enabled ? "Доступен" : "Отключён"}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Провайдеры не настроены"
                      text="Список способов вывода пока пуст."
                    />
                  )}
                </Panel>

                <Panel title="Мои реквизиты" note="Сохранённые реквизиты для вывода средств">
                  {moneyCoreWithdrawDestinations.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {moneyCoreWithdrawDestinations.map((item) => (
                        <PreviewRow
                          key={item.id}
                          title={item.method || "—"}
                          meta={`${item.status || "—"} · ${item.destination_relation || "—"}`}
                          value={item.phone || item.bank_name || item.account_masked || item.card_last4 || "—"}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Реквизиты ещё не добавлены"
                      text="Для этого владельца пока нет сохранённых реквизитов."
                    />
                  )}

                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #eef2f7", display: "grid", gap: 12 }}>
                      <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                      {moneyCoreAddRequisitesText}
                      </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Способ вывода</span>
                        <select
                          disabled
                          defaultValue=""
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed"
                          }}
                        >
                          <option value="">Выберите способ вывода</option>
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Получатель</span>
                        <input
                          disabled
                          defaultValue=""
                          placeholder="Имя получателя"
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Телефон</span>
                        <input
                          disabled
                          defaultValue=""
                          placeholder="+996..."
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Банк</span>
                        <input
                          disabled
                          defaultValue=""
                          placeholder="Название банка"
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Маска счёта / карты</span>
                        <input
                          disabled
                          defaultValue=""
                          placeholder="**** 1234"
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Отношение к владельцу</span>
                        <select
                          disabled
                          defaultValue=""
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed"
                          }}
                        >
                          <option value="">Выберите отношение</option>
                        </select>
                      </label>
                    </div>

                    <button
                      type="button"
                      disabled={!moneyCoreOpen}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 12,
                        background: moneyCoreOpen ? "#f8fafc" : "#e5e7eb",
                        color: moneyCoreOpen ? "#111827" : "#6b7280",
                        padding: "12px 16px",
                        fontWeight: 700,
                        opacity: moneyCoreOpen ? 1 : 0.55,
                        cursor: moneyCoreOpen ? "pointer" : "not-allowed",
                        justifySelf: "start"
                      }}
                    >
                      Добавить реквизиты
                    </button>
                  </div>
                </Panel>

                <Panel title="Настройки вывода" note={moneyCoreWithdrawPanelNote}>
                  {moneyCoreWithdrawSettings ? (
                    <div style={styles.statsGrid}>
                      <StatCard title="Режим" value={moneyCoreWithdrawSettings.mode || "—"} note="Текущий режим" />
                      <StatCard title="Автозаявки" value={String(Boolean(moneyCoreWithdrawSettings.auto_submit_enabled))} note="Автоматизация" />
                      <StatCard title="Проверка админом" value={String(Boolean(moneyCoreWithdrawSettings.requires_admin_review))} note="Контроль" />
                      <StatCard title="Способ суммы" value={moneyCoreWithdrawSettings.amount_mode || "—"} note="Модель суммы" />
                    </div>
                  ) : (
                    <EmptyState
                      title="Настройки вывода не заданы"
                      text={moneyCoreWithdrawSettingsText}
                    />
                  )}
                </Panel>

                <Panel title="История заявок" note="Последние заявки на вывод по Money Core">
                  {moneyCoreWithdrawRequests.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {moneyCoreWithdrawRequests.map((item) => (
                        <PreviewRow
                          key={item.id}
                          title={`Заявка #${item.id}`}
                          meta={`${item.status || "—"} · ${formatDateTime(item.created_at)}`}
                          value={money(item.amount)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Заявок пока нет"
                      text={moneyCoreWithdrawRequestsText}
                    />
                  )}

                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #eef2f7", display: "grid", gap: 12 }}>
                    <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                      {moneyCoreCreateRequestText}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Доступно к выводу</div>
                        <div style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 12, background: "#f9fafb", padding: "12px 14px", fontSize: 14, color: "#111827" }}>
                          {money(moneyCoreZones.available)}
                        </div>
                      </div>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Сумма вывода</span>
                        <input
                          disabled
                          defaultValue=""
                          placeholder="0 сом"
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed"
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Реквизиты</span>
                        <select
                          disabled
                          defaultValue=""
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed"
                          }}
                        >
                          <option value="">Выберите реквизиты</option>
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Комментарий</span>
                        <textarea
                          disabled
                          defaultValue=""
                          placeholder="Комментарий к заявке"
                          rows={3}
                          style={{
                            width: "100%",
                            border: "1px solid #d1d5db",
                            borderRadius: 12,
                            background: "#f9fafb",
                            color: "#6b7280",
                            padding: "12px 14px",
                            fontSize: 14,
                            cursor: "not-allowed",
                            resize: "vertical"
                          }}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      disabled
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 12,
                        background: "#e5e7eb",
                        color: "#6b7280",
                        padding: "12px 16px",
                        fontWeight: 700,
                        opacity: 0.55,
                        cursor: "not-allowed",
                        justifySelf: "start"
                      }}
                    >
                      Создать заявку на вывод
                    </button>
                  </div>
                </Panel>
              </div>
            </Panel>

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
                  <div style={styles.infoValue}>{Number(paymentProjectionSummary?.history_count || 0)}</div>
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
                <FinanceNavCard to={buildSalonPath(slug, "money")} title="Кошелёк и вывод" note="Баланс, расчёты и вывод" />
                <FinanceNavCard to={buildSalonPath(slug, "settlements")} title="Сеты" note="Расчётные периоды" />
                <FinanceNavCard to={buildSalonPath(slug, "payouts")} title="Выплаты" note="Фактические выплаты" />
                <FinanceNavCard to={buildSalonPath(slug, "transactions")} title="Транзакции" note="История операций" />
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
