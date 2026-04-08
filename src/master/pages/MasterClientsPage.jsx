import { useEffect, useMemo, useState } from "react"
import { useMaster } from "../MasterContext"
import PageSection from "../../cabinet/PageSection"
import TableSection from "../../cabinet/TableSection"
import EmptyState from "../../cabinet/EmptyState"

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  window.API_BASE ||
  "https://api.totemv.com"

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
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
      {hint ? <div style={styles.summaryHint}>{hint}</div> : null}
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
          setClientsError("SLUG_MISSING")
          setEmpty(false)
        }
        return
      }

      try{
        setClientsLoading(true)
        setClientsError("")
        setEmpty(false)

        const response = await fetch(
          API_BASE + "/internal/masters/" + encodeURIComponent(slug) + "/clients"
        )

        const text = await response.text()
        let raw = null

        try{
          raw = JSON.parse(text)
        }catch{
          raw = null
        }

        if(!response.ok){
          throw new Error("MASTER_CLIENTS_HTTP_" + response.status)
        }

        const data = normalizeClientsResponse(raw)

        if(!cancelled){
          setClients(data)
          setEmpty(data.length === 0)
        }
      }catch(error){
        console.error("MASTER CLIENTS LOAD ERROR", error)

        if(!cancelled){
          setClients([])
          setClientsError(error?.message || "MASTER_CLIENTS_LOAD_FAILED")
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
        <PageSection title="Клиенты">
          <div style={{
            border: "1px solid #f5c2c7",
            background: "#fff5f5",
            color: "#b42318",
            borderRadius: "10px",
            padding: "12px"
          }}>
            Ошибка загрузки клиентов
          </div>

          {slug ? (
            <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
              slug: {slug}
            </div>
          ) : null}
        </PageSection>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        Загрузка...
      </div>
    )
  }

  if (empty) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSection title="Клиенты">
          <EmptyState
            title="Клиенты пока отсутствуют"
            message="После первых записей клиенты появятся здесь"
          />
        </PageSection>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? "14px" : "20px" }}>
      <PageSection title="Клиенты">
        <div style={styles.summaryGrid}>
          <SummaryCard label="Всего клиентов" value={summary.totalClients} />
          <SummaryCard label="Всего визитов" value={summary.totalVisits} />
          <SummaryCard label="Повторные" value={summary.frequent} hint="2+ визита" />
        </div>

        {isMobile ? (
          <div style={styles.cardsList}>
            {clients.map((c) => (
              <div key={c.id} style={styles.clientCard}>
                <div style={styles.clientName}>{c.name || "Без имени"}</div>

                <div style={styles.metaGrid}>
                  <div>
                    <div style={styles.metaLabel}>Телефон</div>
                    <div style={styles.metaValue}>{c.phone || "—"}</div>
                  </div>

                  <div>
                    <div style={styles.metaLabel}>Визитов</div>
                    <div style={styles.metaValue}>{c.visits ?? 0}</div>
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
                  <th style={{ textAlign: "left", padding: "8px" }}>Имя</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Телефон</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>Визитов</th>
                </tr>
              </thead>

              <tbody>
                {clients.map(c => (
                  <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "8px" }}>
                      {c.name || "Без имени"}
                    </td>

                    <td style={{ padding: "8px" }}>
                      {c.phone || "—"}
                    </td>

                    <td style={{ padding: "8px" }}>
                      {c.visits ?? 0}
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
