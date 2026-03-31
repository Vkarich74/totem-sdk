import { useEffect, useMemo, useState } from "react"

import PageSection from "../../cabinet/PageSection"
import TableSection from "../../cabinet/TableSection"
import EmptyState from "../../cabinet/EmptyState"

const API_BASE = import.meta.env.VITE_API_BASE

function getMasterSlug() {
  if (window.MASTER_SLUG) {
    return window.MASTER_SLUG
  }

  const hash = window.location.hash || ""
  const hashPath = hash.startsWith("#") ? hash.slice(1) : hash
  const cleanHashPath = hashPath.startsWith("/") ? hashPath : `/${hashPath}`
  const hashParts = cleanHashPath.split("/").filter(Boolean)

  if (hashParts.length >= 2 && hashParts[0] === "master") {
    return hashParts[1]
  }

  const pathParts = window.location.pathname.split("/").filter(Boolean)

  if (pathParts.length >= 2 && pathParts[0] === "master") {
    return pathParts[1]
  }

  return null
}

function money(value) {
  const n = Number(value) || 0
  return `${new Intl.NumberFormat("ru-RU").format(n)} сом`
}

function formatDate(iso) {
  if (!iso) return "—"

  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"

  return (
    d.toLocaleDateString("ru-RU") +
    " " +
    d.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    })
  )
}

export default function MasterPayoutsPage() {
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const slug = getMasterSlug()

        if (!slug) {
          console.error("MASTER_SLUG_NOT_FOUND")
          if (!cancelled) {
            setError("Не найден master slug")
          }
          return
        }

        const res = await fetch(
          `${API_BASE}/internal/masters/${slug}/payouts`
        )

        if (!res.ok) {
          throw new Error("PAYOUTS_FETCH_FAILED")
        }

        const data = await res.json()

        if (cancelled) return

        // ключ: payouts массив
        setPayouts(Array.isArray(data?.payouts) ? data.payouts : [])
      } catch (e) {
        console.error("Payouts load error", e)

        if (!cancelled) {
          setPayouts([])
          setError("Не удалось загрузить выплаты")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const total = useMemo(() => {
    return payouts.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
  }, [payouts])

  return (
    <PageSection title="Выплаты">
      {loading && <div>Загрузка...</div>}

      {!loading && error && (
        <EmptyState text={error} />
      )}

      {!loading && !error && payouts.length === 0 && (
        <EmptyState text="Выплат пока нет" />
      )}

      {!loading && !error && payouts.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
              marginBottom: "16px"
            }}
          >
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Кол-во</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{payouts.length}</div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Сумма</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{money(total)}</div>
            </div>
          </div>

          <TableSection>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">ID</th>
                  <th align="left">Дата</th>
                  <th align="left">Сумма</th>
                  <th align="left">Статус</th>
                </tr>
              </thead>

              <tbody>
                {payouts.map((p, i) => {
                  const last = i === payouts.length - 1

                  return (
                    <tr key={p.id || i}>
                      <td style={{ padding: 10, borderBottom: last ? "none" : "1px solid #eee" }}>
                        {p.id}
                      </td>

                      <td style={{ padding: 10, borderBottom: last ? "none" : "1px solid #eee" }}>
                        {formatDate(p.created_at)}
                      </td>

                      <td style={{ padding: 10, borderBottom: last ? "none" : "1px solid #eee", fontWeight: 600 }}>
                        {money(p.amount)}
                      </td>

                      <td style={{ padding: 10, borderBottom: last ? "none" : "1px solid #eee" }}>
                        {p.status}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableSection>
        </>
      )}
    </PageSection>
  )
}