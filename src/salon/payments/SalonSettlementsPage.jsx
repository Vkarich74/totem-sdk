import { UiValue, uiMessage, uiMoney, uiDate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"
import { getSalonSettlements } from "../../api/internal"

function money(value, currency) { return uiMoney(value, currency); }

function formatDateTime(value){ if (!value) return "—"; return uiDate(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

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
  if(status === "open") return uiMessage("salon.s0879")
  if(status === "closed") return uiMessage("salon.s0880")
  if(status === "pending") return uiMessage("salon.s0042")
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
      title: uiMessage("salon.s0300"),
      tone: "#b42318",
      bg: "#fff5f5",
      border: "#f5c2c7",
      note: uiError(billingBlockReason, uiMessage("salon.s0874"))
    }
  }

  if(state === "grace"){
    return {
      title: uiMessage("salon.s0302"),
      tone: "#9a6700",
      bg: "#fff8db",
      border: "#facc15",
      note: uiError(billingBlockReason, uiMessage("salon.s0875"))
    }
  }

  return {
    title: uiMessage("salon.s0304"),
    tone: "#027a48",
    bg: "#ecfdf3",
    border: "#abefc6",
    note: uiMessage("salon.s1141")
  }
}

function FinanceNav({ slug, active }){
  const { renderUi } = useUiMessages();
  const items = [
    { key: "finance", label: uiMessage("salon.s0017"), note: uiMessage("salon.s1070"), to: buildSalonPath(slug, "finance") },
    { key: "money", label: uiMessage("salon.s0412"), note: uiMessage("salon.s0902"), to: buildSalonPath(slug, "money") },
    { key: "settlements", label: uiMessage("salon.s0029"), note: uiMessage("salon.s1071"), to: buildSalonPath(slug, "settlements") },
    { key: "payouts", label: uiMessage("salon.s0030"), note: uiMessage("salon.s1072"), to: buildSalonPath(slug, "payouts") },
    { key: "transactions", label: uiMessage("salon.s0031"), note: uiMessage("salon.s1073"), to: buildSalonPath(slug, "transactions") },
    { key: "contracts", label: uiMessage("salon.s0032"), note: uiMessage("salon.s1074"), to: buildSalonPath(slug, "contracts") }
  ]

  return (
    <nav aria-label={renderUi(uiMessage("salon.s0900"))} style={styles.navGrid}>
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
            <div style={{ ...styles.navTitle, color: isActive ? "#1d4ed8" : "#111827" }}><UiValue value={item.label} /></div>
            <div style={styles.navNote}><UiValue value={item.note} /></div>
          </Link>
        )
      })}
    </nav>
  )
}

function StatCard({ title, value, note }){
  return (
    <article style={styles.statCard}>
      <div style={styles.statLabel}><UiValue value={title} /></div>
      <div style={styles.statValue}><UiValue value={value} /></div>
      {note ? <div style={styles.statNote}><UiValue value={note} /></div> : null}
    </article>
  )
}

function Panel({ title, note, children }){
  return (
    <section style={styles.panel}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.panelTitle}><UiValue value={title} /></h2>
        {note ? <p style={styles.panelNote}><UiValue value={note} /></p> : null}
      </div>
      <div style={{ marginTop: 14 }}><UiValue value={children} /></div>
    </section>
  )
}

function EmptyBox({ title, text }){
  return (
    <div style={styles.emptyBox}>
      <h3 style={styles.emptyTitle}><UiValue value={title} /></h3>
      <p style={styles.emptyText}><UiValue value={text} /></p>
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
          setError(uiError(uiMessage("salon.s1075")))
        }
        return
      }

      try{
        setLoading(true)
        setError("")

        const result = await getSalonSettlements(slug)

        if(cancelled) return

        if(!result?.ok){
          throw new Error("SALON_SETTLEMENTS_FETCH_FAILED")
        }

        setSettlements(normalizeSettlements({ settlements: result.settlements || [] }))
      }catch(e){
        console.error("SALON_SETTLEMENTS_LOAD_FAILED", e)

        if(!cancelled){
          setSettlements([])
          setError(uiError(uiMessage("salon.s1142")))
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
          <p style={styles.eyebrow}><UiValue value={uiMessage("salon.s0907")} /></p>
          <h1 style={styles.pageTitle}><UiValue value={uiMessage("salon.s0029")} /></h1>
          <p style={styles.pageSubtitle}><UiValue value={uiMessage("salon.s1143")} /></p>
        </header>

        <section
          style={{
            ...styles.alert,
            background: billingUi.bg,
            borderColor: billingUi.border
          }}
        >
          <div style={styles.alertMain}>
            <h2 style={{ ...styles.alertTitle, color: billingUi.tone }}><UiValue value={billingUi.title} /></h2>
            <p style={styles.alertText}><UiValue value={billingUi.note} /></p>
          </div>
          <div style={styles.alertMeta}>
            <div><UiValue value={uiMessage("salon.s0911")} /><UiValue value={canWithdraw ? uiMessage("salon.s0912") : uiMessage("salon.s0913")} /></div>
            <div><UiValue value={uiMessage("salon.s1144")} /><UiValue value={settlements.length} /></div>
          </div>
        </section>

        <section style={styles.statsGrid}>
          <StatCard title={uiMessage("salon.s1087")} value={settlements.length} note={uiMessage("salon.s1145")} />
          <StatCard title={uiMessage("salon.s1118")} value={money(totalAmount)} note={uiMessage("salon.s1146")} />
          <StatCard title={uiMessage("salon.s1147")} value={openCount} note={uiMessage("salon.s1148")} />
          <StatCard title={uiMessage("salon.s1149")} value={closedCount} note={lastSettlement ? uiMessage("salon.s1150", {p0: getStatusLabel(lastSettlement?.status)}) : uiMessage("salon.s1151")} />
        </section>

        <div style={styles.mainStack}>
          <Panel
            title={uiMessage("salon.s1152")}
            note={uiMessage("salon.s1153")}
          >
            {pageLoading ? <div style={styles.infoText}><UiValue value={uiMessage("salon.s0118")} /></div> : null}

            {pageError ? (
              <EmptyBox
                title={contextError ? uiMessage("salon.s1035") : uiMessage("salon.s1036")}
                text={contextError ? uiMessage("salon.s1037") : error}
              />
            ) : null}

            {pageEmpty ? (
              <EmptyBox
                title={uiMessage("salon.s1154")}
                text={uiMessage("salon.s1155")}
              />
            ) : null}

            {!pageLoading && !pageError && !pageEmpty ? (
              <>
                <div style={styles.listHeader}>
                  <div>
                    <h3 style={styles.listTitle}><UiValue value={uiMessage("salon.s1156")} /></h3>
                    <p style={styles.listNote}><UiValue value={uiMessage("salon.s1157")} /></p>
                  </div>
                  <div style={styles.listMeta}><UiValue value={uiMessage("salon.s1158")} /><UiValue value={lastSettlement ? formatDateTime(lastSettlement?.period_end || lastSettlement?.created_at) : "—"} />
                  </div>
                </div>

                <div style={styles.cardsList}>
                  {settlements.map((item, index) => (
                    <article key={item?.id || index} style={styles.itemCard}>
                      <div style={styles.itemTop}>
                        <div>
                          <h3 style={styles.itemTitle}><UiValue value={item?.id || uiMessage("salon.s1111", {p0: index + 1})} /></h3>
                          <p style={styles.itemSubtitle}>
                            <UiValue value={formatDateTime(item?.period_start || item?.start_date)} /> → <UiValue value={formatDateTime(item?.period_end || item?.end_date)} />
                          </p>
                        </div>
                        <div style={styles.badge}><UiValue value={getStatusLabel(item?.status)} /></div>
                      </div>

                      <div style={styles.metaGrid}>
                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0147")} /></div>
                          <div style={styles.metaValue}><UiValue value={money(item?.amount ?? item?.total_amount, item?.currency_code || item?.currency)} /></div>
                        </div>

                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s1160")} /></div>
                          <div style={styles.metaValue}><UiValue value={formatDateTime(item?.created_at)} /></div>
                        </div>

                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s1161")} /></div>
                          <div style={styles.metaValue}><UiValue value={formatDateTime(item?.period_start || item?.start_date)} /></div>
                        </div>

                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s1162")} /></div>
                          <div style={styles.metaValue}><UiValue value={formatDateTime(item?.period_end || item?.end_date)} /></div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </Panel>

          <Panel
            title={uiMessage("salon.s1032")}
            note={uiMessage("salon.s1163")}
          >
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1135")} /></div>
                <div style={styles.infoValue}><UiValue value={canWithdraw ? uiMessage("salon.s1136") : uiMessage("salon.s1137")} /></div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1138")} /></div>
                <div style={styles.infoValue}><UiValue value={lastSettlement ? money(lastSettlement?.amount ?? lastSettlement?.total_amount, lastSettlement?.currency_code || lastSettlement?.currency) : "—"} /></div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1139")} /></div>
                <div style={styles.infoValue}><UiValue value={lastSettlement ? getStatusLabel(lastSettlement?.status) : "—"} /></div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1164")} /></div>
                <div style={styles.infoValue}><UiValue value={openCount} /></div>
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
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
    marginBottom: "16px"
  },
  navCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px 14px",
    textDecoration: "none",
    display: "block",
    minWidth: 0,
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
    marginBottom: "16px",
    minWidth: 0
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
    marginTop: "14px",
    minWidth: 0
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
    gap: "12px",
    minWidth: 0
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
