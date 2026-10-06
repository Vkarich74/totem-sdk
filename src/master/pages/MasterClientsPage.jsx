import { UiValue, uiMessage, uiError } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import { useMaster } from "../MasterContext"
import PageSection from "../../cabinet/PageSection"
import TableSection from "../../cabinet/TableSection"
import EmptyState from "../../cabinet/EmptyState"
import { getMasterClients } from "../../api/internal"

function normalizeClientsResponse(payload){
  if(Array.isArray(payload)) return payload
  if(Array.isArray(payload?.clients)) return payload.clients
  if(Array.isArray(payload?.data?.clients)) return payload.data.clients
  return []
}

function useIsMobile(){
  const getValue = () => {
    if(typeof window === "undefined") return false
    return window.innerWidth <= 768
  }

  const [isMobile, setIsMobile] = useState(getValue)

  useEffect(() => {
    if(typeof window === "undefined") return undefined

    function onResize(){
      setIsMobile(getValue())
    }

    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return isMobile
}

function SummaryCard({ label, value, hint }){
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}><UiValue value={label} /></div>
      <div style={styles.summaryValue}><UiValue value={value} /></div>
      {hint ? <div style={styles.summaryHint}><UiValue value={hint} /></div> : null}
    </div>
  )
}

export default function MasterClientsPage() {
  const {
    loading: masterLoading,
    error: masterError,
    slug
  } = useMaster()

  const isMobile = useIsMobile()
  const [clients, setClients] = useState([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientsError, setClientsError] = useState("")
  const [empty, setEmpty] = useState(false)

  useEffect(()=>{
    let cancelled = false

    async function loadClients(){
      if(!slug){
        if(!cancelled){
          setClients([])
          setClientsLoading(false)
          setClientsError(uiError("SLUG_MISSING"))
          setEmpty(false)
        }
        return
      }

      try{
        setClientsLoading(true)
        setClientsError("")
        setEmpty(false)

        const result = await getMasterClients(slug)

        if(!result?.ok){
          const status = Number(result?.detail?.status || result?.detail?.response?.status || 0)
          throw new Error(status ? "MASTER_CLIENTS_HTTP_" + status : (result?.error || "MASTER_CLIENTS_LOAD_FAILED"))
        }

        const data = normalizeClientsResponse(result)

        if(!cancelled){
          setClients(data)
          setEmpty(data.length === 0)
        }
      }catch(error){
        console.error("MASTER CLIENTS LOAD ERROR", error)

        if(!cancelled){
          setClients([])
          setClientsError(uiError(error?.message || "MASTER_CLIENTS_LOAD_FAILED"))
          setEmpty(false)
        }
      }finally{
        if(!cancelled){
          setClientsLoading(false)
        }
      }
    }

    loadClients()

    return ()=>{
      cancelled = true
    }
  },[slug])

  const loading = masterLoading || clientsLoading
  const error = masterError || clientsError

  const summary = useMemo(() => {
    const totalVisits = clients.reduce((acc, item) => acc + (Number(item?.visits) || 0), 0)
    const frequent = clients.filter((item) => (Number(item?.visits) || 0) >= 2).length

    return {
      totalClients: clients.length,
      totalVisits,
      frequent
    }
  }, [clients])

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSection title={uiMessage("salon.s0016")}>
          <div style={{
            border: "1px solid #f5c2c7",
            background: "#fff5f5",
            color: "#b42318",
            borderRadius: "10px",
            padding: "12px"
          }}><UiValue value={uiMessage("master.s0246")} /></div>

          {slug ? (
            <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}><UiValue value={uiMessage("salon.s0315")} /><UiValue value={slug} />
            </div>
          ) : null}
        </PageSection>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: "20px" }}><UiValue value={uiMessage("salon.s0274")} /></div>
    )
  }

  if (empty) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSection title={uiMessage("salon.s0016")}>
          <EmptyState
            title={uiMessage("master.s0248")}
            message={uiMessage("master.s0249")}
          />
        </PageSection>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? "14px" : "20px" }}>
      <PageSection title={uiMessage("salon.s0016")}>
        <div style={styles.summaryGrid}>
          <SummaryCard label={uiMessage("master.s0250")} value={summary.totalClients} />
          <SummaryCard label={uiMessage("master.s0251")} value={summary.totalVisits} />
          <SummaryCard label={uiMessage("master.s0252")} value={summary.frequent} hint={uiMessage("master.s0253")} />
        </div>

        {isMobile ? (
          <div style={styles.cardsList}>
            {clients.map((c) => (
              <div key={c.id} style={styles.clientCard}>
                <div style={styles.clientName}><UiValue value={c.name || uiMessage("salon.s0276")} /></div>

                <div style={styles.metaGrid}>
                  <div>
                    <div style={styles.metaLabel}><UiValue value={uiMessage("salon.s0230")} /></div>
                    <div style={styles.metaValue}><UiValue value={c.phone || "—"} /></div>
                  </div>

                  <div>
                    <div style={styles.metaLabel}><UiValue value={uiMessage("master.s0255")} /></div>
                    <div style={styles.metaValue}><UiValue value={c.visits ?? 0} /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TableSection>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px" }}><UiValue value={uiMessage("salon.s0654")} /></th>
                  <th style={{ textAlign: "left", padding: "8px" }}><UiValue value={uiMessage("salon.s0230")} /></th>
                  <th style={{ textAlign: "left", padding: "8px" }}><UiValue value={uiMessage("master.s0255")} /></th>
                </tr>
              </thead>

              <tbody>
                {clients.map(c => (
                  <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "8px" }}>
                      <UiValue value={c.name || uiMessage("salon.s0276")} />
                    </td>

                    <td style={{ padding: "8px" }}>
                      <UiValue value={c.phone || "—"} />
                    </td>

                    <td style={{ padding: "8px" }}>
                      <UiValue value={c.visits ?? 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableSection>
        )}
      </PageSection>
    </div>
  )
}

const styles = {
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "16px"
  },
  summaryCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    padding: "14px"
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px"
  },
  summaryValue: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#111827"
  },
  summaryHint: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#6b7280"
  },
  cardsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  clientCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "14px"
  },
  clientName: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "12px"
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px"
  },
  metaLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "4px"
  },
  metaValue: {
    fontSize: "14px",
    color: "#111827",
    fontWeight: 600,
    wordBreak: "break-word"
  }
}
