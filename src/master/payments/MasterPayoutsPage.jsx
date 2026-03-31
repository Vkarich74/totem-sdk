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

function getStatusLabel(status) {
  if (status === "pending") return "В обработке"
  if (status === "processing") return "Обрабатывается"
  if (status === "completed") return "Завершено"
  if (status === "failed") return "Ошибка"
  return status || "—"
}

export default function MasterPayoutsPage() {
  const { master, slug: contextSlug } = useMaster() || {}
  const masterSlug = master?.slug || contextSlug || null

  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        if (!masterSlug) {
          console.error("MASTER_SLUG_NOT_FOUND")

          if (!cancelled) {
            setError("Не найден master slug")
            setPayouts([])
          }

          return
        }

        const res = await fetch(
          `${API_BASE}/internal/masters/${masterSlug}/payouts`
        )

        if (!res.ok) {
          throw new Error("PAYOUTS_FETCH_FAILED")
        }

        const data = await res.json()

        if (cancelled) return

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
  }, [masterSlug])

  const total = useMemo(() => {
    return payouts.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
  }, [payouts])

  return (
    <div style={{ padding: "20px" }}>
      <PageSection title="Выплаты">
        {loading && <div>Загрузка...</div>}

        {!loading && error && (
          <EmptyState
            title="Ошибка загрузки"
            message={error}
          />
        )}

        {!loading && !error && payouts.length === 0 && (
          <EmptyState
            title="Выплат нет"
            message="Выплаты появятся после закрытия сетов"
          />
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
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  background: "#ffffff",
                  padding: "14px"
                }}
              >
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                  Кол-во выплат
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>
                  {payouts.length}
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
                  {money(total)}
                </div>
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
                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: last ? "none" : "1px solid #eef2f7"
                          }}
                        >
                          {p.id}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: last ? "none" : "1px solid #eef2f7"
                          }}
                        >
                          {formatDate(p.created_at)}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: last ? "none" : "1px solid #eef2f7",
                            fontWeight: 600
                          }}
                        >
                          {money(p.amount)}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: last ? "none" : "1px solid #eef2f7"
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