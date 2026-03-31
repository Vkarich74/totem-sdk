import { useEffect, useMemo, useState } from "react"
import { useMaster } from "../MasterContext"

import PageSection from "../../cabinet/PageSection"
import TableSection from "../../cabinet/TableSection"
import EmptyState from "../../cabinet/EmptyState"

const API_BASE = import.meta.env.VITE_API_BASE

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

function getStatusLabel(status) {
  if (status === "open") return "Открыт"
  if (status === "closed") return "Закрыт"
  return status || "—"
}

export default function MasterSettlementsPage() {
  const { master, slug: contextSlug } = useMaster() || {}
  const masterSlug = master?.slug || contextSlug || null

  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadSettlements() {
      try {
        setLoading(true)
        setError(null)

        if (!masterSlug) {
          console.error("MASTER_SLUG_NOT_FOUND")

          if (!cancelled) {
            setPeriods([])
            setError("Не найден master slug")
          }

          return
        }

        const res = await fetch(
          `${API_BASE}/internal/masters/${masterSlug}/settlements`
        )

        if (!res.ok) {
          throw new Error("SETTLEMENTS_FETCH_FAILED")
        }

        const data = await res.json()

        if (cancelled) {
          return
        }

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
  }, [masterSlug])

  const totalAmount = useMemo(() => {
    return periods.reduce((acc, item) => {
      return acc + (Number(item?.amount) || 0)
    }, 0)
  }, [periods])

  return (
    <div style={{ padding: "20px" }}>
      <PageSection title="Сеты">
        {loading && <div>Загрузка...</div>}

        {!loading && error && (
          <EmptyState
            title="Ошибка загрузки"
            message={error}
          />
        )}

        {!loading && !error && periods.length === 0 && (
          <EmptyState
            title="Сеты отсутствуют"
            message="Расчетные периоды появятся после транзакций"
          />
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
                  Кол-во сетов
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
                    <th align="left">ID</th>
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
                            padding: "12px 10px",
                            borderBottom: isLast ? "none" : "1px solid #eef2f7"
                          }}
                        >
                          {p.id || "—"}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: isLast ? "none" : "1px solid #eef2f7"
                          }}
                        >
                          {formatDate(p.period_start)}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: isLast ? "none" : "1px solid #eef2f7"
                          }}
                        >
                          {formatDate(p.period_end)}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: isLast ? "none" : "1px solid #eef2f7",
                            fontWeight: 600
                          }}
                        >
                          {money(p.amount)}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: isLast ? "none" : "1px solid #eef2f7"
                          }}
                        >
                          {getStatusLabel(p.status)}
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
    </div>
  )
}