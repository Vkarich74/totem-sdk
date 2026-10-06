import { UiValue, uiMessage, uiMoney, uiDate, uiTemplate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"
import { getSalonLedger } from "../../api/internal"

function money(value, currency) { return uiMoney(value, currency); }

function formatDateTime(value){ if (!value) return "—"; return uiDate(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

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
  if(direction === "credit") return uiMessage("salon.s1165")
  if(direction === "debit") return uiMessage("salon.s1166")
  return value || "—"
}

function getTypeLabel(value){
  const type = String(value || "").toLowerCase()
  if(type === "payout") return uiMessage("salon.s1066")
  if(type === "subscription") return uiMessage("salon.s1167")
  if(type === "platform_fee") return uiMessage("salon.s1168")
  if(type === "payment") return uiMessage("salon.s1169")
  if(type === "settlement") return uiMessage("salon.s1170")
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
    note: uiMessage("salon.s1171")
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
  const [transactionsExpanded, setTransactionsExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadTransactions(){
      if(!slug){
        if(!cancelled){
          setTransactions([])
          setLoading(false)
          setError(uiError(uiMessage("salon.s1075")))
        }
        return
      }

      try{
        setLoading(true)
        setError("")

        const result = await getSalonLedger(slug)

        if(cancelled) return

        if(!result?.ok){
          throw new Error("SALON_LEDGER_FETCH_FAILED")
        }

        setTransactions(normalizeLedger({ ledger: result.ledger || [] }))
      }catch(e){
        console.error("SALON_TRANSACTIONS_LOAD_FAILED", e)

        if(!cancelled){
          setTransactions([])
          setError(uiError(uiMessage("salon.s1172")))
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

  const lastTransaction = transactions[0] || null
  const billingUi = getBillingUi(billingAccess, billingBlockReason)
  const pageLoading = contextLoading || loading
  const pageError = !pageLoading && (contextError || error)
  const pageEmpty = !pageLoading && !pageError && transactions.length === 0
  const visibleTransactions = transactionsExpanded ? transactions : transactions.slice(0, 3)
  const hiddenTransactionsCount = Math.max(transactions.length - 3, 0)

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {slug ? <FinanceNav slug={slug} active="transactions" /> : null}

        <header style={styles.pageHeader}>
          <p style={styles.eyebrow}><UiValue value={uiMessage("salon.s0907")} /></p>
          <h1 style={styles.pageTitle}><UiValue value={uiMessage("salon.s0031")} /></h1>
          <p style={styles.pageSubtitle}><UiValue value={uiMessage("salon.s1173")} /></p>
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
            <div><UiValue value={uiMessage("salon.s1115")} /><UiValue value={transactions.length} /></div>
            <div><UiValue value={uiMessage("salon.s1174")} /><UiValue value={lastTransaction ? formatDateTime(lastTransaction?.created_at || lastTransaction?.date) : "—"} /></div>
          </div>
        </section>

        <section style={styles.statsGrid}>
          <StatCard title={uiMessage("salon.s1175")} value={transactions.length} note={uiMessage("salon.s1176")} />
          <StatCard title={uiMessage("salon.s1177")} value={money(creditAmount)} note={uiMessage("salon.s1178", {p0: creditCount})} />
          <StatCard title={uiMessage("salon.s1179")} value={money(debitAmount)} note={uiMessage("salon.s1178", {p0: debitCount})} />
          <StatCard title={uiMessage("salon.s1180")} value={money(totalAmount)} note={uiMessage("salon.s1181")} />
        </section>

        <div style={styles.mainStack}>
          <Panel
            title={uiMessage("salon.s1182")}
            note={uiMessage("salon.s1183")}
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
                title={uiMessage("salon.s1184")}
                text={uiMessage("salon.s1185")}
              />
            ) : null}

            {!pageLoading && !pageError && !pageEmpty ? (
              <>
                <div style={styles.listHeader}>
                  <div>
                    <h3 style={styles.listTitle}><UiValue value={uiMessage("salon.s1186")} /></h3>
                    <p style={styles.listNote}><UiValue value={uiMessage("salon.s1187")} /></p>
                  </div>
                  <div style={styles.listMeta}><UiValue value={uiMessage("salon.s1188")} /><UiValue value={lastTransaction ? formatDateTime(lastTransaction?.created_at || lastTransaction?.date) : "—"} />
                  </div>
                </div>

                <div style={styles.list}>
                  {visibleTransactions.map((item, index) => (
                    <article key={item?.id || uiTemplate(["","-",""], [item?.reference_id || "tx", index])} style={styles.itemCard}>
                      <div style={styles.itemTop}>
                        <h3 style={styles.itemTitle}><UiValue value={item?.id || uiMessage("salon.s1189", {p0: index + 1})} /></h3>
                        <span style={styles.directionBadge}><UiValue value={getDirectionLabel(item?.direction)} /></span>
                      </div>

                      <div style={styles.metaGrid}>
                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s1190")} /></div>
                          <div style={styles.metaValue}><UiValue value={getTypeLabel(item?.reference_type || item?.type)} /></div>
                        </div>

                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0147")} /></div>
                          <div style={styles.metaValue}><UiValue value={money(item?.amount, item?.currency_code || item?.currency)} /></div>
                        </div>

                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0233")} /></div>
                          <div style={styles.metaValue}><UiValue value={formatDateTime(item?.created_at || item?.date)} /></div>
                        </div>

                        <div style={styles.metaCell}>
                          <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s1191")} /></div>
                          <div style={styles.metaValue}><UiValue value={item?.reference_id || "—"} /></div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {transactions.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setTransactionsExpanded((value) => !value)}
                    style={{
                      marginTop: "12px",
                      border: "1px solid #d0d5dd",
                      background: "#ffffff",
                      color: "#344054",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    <UiValue value={transactionsExpanded ? uiMessage("salon.s0166") : uiMessage("salon.s0167", {p0: hiddenTransactionsCount})} />
                  </button>
                ) : null}
              </>
            ) : null}
          </Panel>

          <Panel
            title={uiMessage("salon.s1032")}
            note={uiMessage("salon.s1192")}
          >
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1193")} /></div>
                <div style={styles.infoValue}><UiValue value={lastTransaction ? getTypeLabel(lastTransaction?.reference_type || lastTransaction?.type) : "—"} /></div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1194")} /></div>
                <div style={styles.infoValue}><UiValue value={lastTransaction ? getDirectionLabel(lastTransaction?.direction) : "—"} /></div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1195")} /></div>
                <div style={styles.infoValue}><UiValue value={creditCount} /></div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}><UiValue value={uiMessage("salon.s1196")} /></div>
                <div style={styles.infoValue}><UiValue value={debitCount} /></div>
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
    padding: "14px",
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
    borderRadius: "14px",
    padding: "12px 14px",
    textDecoration: "none",
    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
    minWidth: 0,
    background: "#ffffff"
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
    color: "#667085",
    lineHeight: 1.6,
    textAlign: "right"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
    minWidth: 0
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
  mainStack: {
    display: "grid",
    gap: "14px"
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #eaecf0",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(16,24,40,0.06)"
  },
  sectionHeader: {
    display: "grid",
    gap: "6px"
  },
  panelTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    color: "#101828"
  },
  panelNote: {
    margin: 0,
    fontSize: "13px",
    color: "#667085",
    lineHeight: 1.5
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
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#101828"
  },
  emptyText: {
    margin: "8px 0 0",
    fontSize: "14px",
    color: "#667085",
    lineHeight: 1.5
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "14px"
  },
  listTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 800,
    color: "#101828"
  },
  listNote: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#667085",
    lineHeight: 1.45
  },
  listMeta: {
    fontSize: "12px",
    color: "#667085"
  },
  list: {
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
    margin: 0,
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
    gap: "12px",
    minWidth: 0
  },
  metaCell: {
    borderTop: "1px solid #eef2f7",
    paddingTop: "12px"
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
