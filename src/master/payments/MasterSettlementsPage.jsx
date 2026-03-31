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
  if (!iso) {
    return "—"
  }

  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) {
    return "—"
  }

  return (
    d.toLocaleDateString("ru-RU") +
    " " +
    d.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    })
  )
}

export default function MasterSettlementsPage() {
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadSettlements() {
      try {
        setLoading(true)
        setError(null)

        const slug = getMasterSlug()

        if (!slug) {
          console.error("MASTER_SLUG_NOT_FOUND")

          if (!cancelled) {
            setPeriods([])
            setError("Не найден master slug")
          }

          return
        }

        const res = await fetch(
          `${API_BASE}/internal/masters/${slug}/settlements`
        )

        if (!res.ok) {
          throw new Error("SETTLEMENTS_FETCH_FAILED")
        }

        const data = await res.json()

        if (cancelled) {
          return
        }

        // 🔴 КЛЮЧЕВОЙ ФИКС:
        // backend возвращает settlements, а не periods
        setPeriods(Array.isArray(data?.settlements) ? data.settlements : [])
      } catch (e) {
        console.error("Settlements load error", e)

        if (!cancelled) {
          setPeriods([])
          setError("Не удалось загрузить расчетные периоды")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSettlements()

    return () => {
      cancelled = true
    }
  }, [])

  const totalAmount = useMemo(() => {
    return periods.reduce((acc, item) => {
      return acc + (Number(item?.amount) || 0)
    }, 0)
  }, [periods])

  return (
    <PageSection title="Сеты">
      {loading && <div>Загрузка...</div>}

      {!loading && error && (
        <EmptyState text={error} />
      )}

      {!loading && !error && periods.length === 0 && (
        <EmptyState text="Расчетных периодов пока нет" />
      )}

      {!loading && !error && periods.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
              marginBottom: "16px"
            }}
          >
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                background: "#ffffff",
                padding: "14px"
              }}
            >
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                Кол-во периодов
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>
                {periods.length}
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                background: "#ffffff",
                padding: "14px"
              }}
            >
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                Общая сумма
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>
                {money(totalAmount)}
              </div>
            </div>
          </div>

          <TableSection>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Период</th>
                  <th align="left">Начало</th>
                  <th align="left">Конец</th>
                  <th align="left">Сумма</th>
                  <th align="left">Статус</th>
                </tr>
              </thead>

              <tbody>
                {periods.map((p, index) => {
                  const isLast = index === periods.length - 1

                  return (
                    <tr key={p.id || index}>
                      <td
                        style={{
                          borderBottom: isLast ? "none" : "1px solid #eef2f7",
                          padding: "10px"
                        }}
                      >
                        {p.id || "—"}
                      </td>

                      <td
                        style={{
                          borderBottom: isLast ? "none" : "1px solid #eef2f7",
                          padding: "10px"
                        }}
                      >
                        {formatDate(p.period_start)}
                      </td>

                      <td
                        style={{
                          borderBottom: isLast ? "none" : "1px solid #eef2f7",
                          padding: "10px"
                        }}
                      >
                        {formatDate(p.period_end)}
                      </td>

                      <td
                        style={{
                          borderBottom: isLast ? "none" : "1px solid #eef2f7",
                          padding: "10px",
                          fontWeight: 600
                        }}
                      >
                        {money(p.amount)}
                      </td>

                      <td
                        style={{
                          borderBottom: isLast ? "none" : "1px solid #eef2f7",
                          padding: "10px"
                        }}
                      >
                        {p.status || "—"}
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