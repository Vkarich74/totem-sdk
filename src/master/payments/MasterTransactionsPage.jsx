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

function getDirectionLabel(value) {
  if (value === "credit") {
    return "Пополнение"
  }

  if (value === "debit") {
    return "Списание"
  }

  return value || "—"
}

function getTypeLabel(value) {
  if (value === "payout") {
    return "Выплата"
  }

  if (value === "subscription") {
    return "Подписка"
  }

  if (value === "platform_fee") {
    return "Платформа"
  }

  if (value === "refund_reverse") {
    return "Refund reverse"
  }

  return value || "—"
}

export default function MasterTransactionsPage() {
  const { master, slug: contextSlug } = useMaster() || {}
  const masterSlug = master?.slug || contextSlug || null

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadTransactions() {
      try {
        setLoading(true)
        setError(null)

        if (!masterSlug) {
          console.error("MASTER_SLUG_NOT_FOUND")

          if (!cancelled) {
            setTransactions([])
            setError("Не найден master slug")
          }

          return
        }

        const res = await fetch(`${API_BASE}/internal/masters/${masterSlug}/ledger`)

        if (!res.ok) {
          throw new Error("LEDGER_FETCH_FAILED")
        }

        const data = await res.json()

        if (cancelled) {
          return
        }

        setTransactions(Array.isArray(data?.ledger) ? data.ledger : [])
      } catch (e) {
        console.error("Transactions load error", e)

        if (!cancelled) {
          setTransactions([])
          setError("Не удалось загрузить транзакции")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadTransactions()

    return () => {
      cancelled = true
    }
  }, [masterSlug])

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, item) => {
        const amount = Number(item?.amount) || 0

        acc.total += amount

        if (item?.direction === "credit") {
          acc.creditCount += 1
          acc.creditAmount += amount
        }

        if (item?.direction === "debit") {
          acc.debitCount += 1
          acc.debitAmount += amount
        }

        return acc
      },
      {
        total: 0,
        creditCount: 0,
        creditAmount: 0,
        debitCount: 0,
        debitAmount: 0
      }
    )
  }, [transactions])

  return (
    <div style={{ padding: "20px" }}>
      <PageSection title="Транзакции">
        {loading && <div>Загрузка...</div>}

        {!loading && error && (
          <EmptyState
            title="Ошибка загрузки"
            message={error}
          />
        )}

        {!loading && !error && transactions.length === 0 && (
          <EmptyState
            title="Транзакций пока нет"
            message="Финансовые операции появятся здесь"
          />
        )}

        {!loading && !error && transactions.length > 0 && (
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
                  Всего операций
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>
                  {transactions.length}
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
                  Пополнения
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>
                  {money(summary.creditAmount)}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                  {summary.creditCount} шт.
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
                  Списания
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>
                  {money(summary.debitAmount)}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                  {summary.debitCount} шт.
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
                  Общий оборот
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>
                  {money(summary.total)}
                </div>
              </div>
            </div>

            <TableSection>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th
                      align="left"
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: "12px",
                        color: "#6b7280"
                      }}
                    >
                      Дата
                    </th>
                    <th
                      align="left"
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: "12px",
                        color: "#6b7280"
                      }}
                    >
                      Тип
                    </th>
                    <th
                      align="left"
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: "12px",
                        color: "#6b7280"
                      }}
                    >
                      Reference ID
                    </th>
                    <th
                      align="left"
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: "12px",
                        color: "#6b7280"
                      }}
                    >
                      Направление
                    </th>
                    <th
                      align="left"
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: "12px",
                        color: "#6b7280"
                      }}
                    >
                      Сумма
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((t, index) => {
                    const isLast = index === transactions.length - 1

                    return (
                      <tr key={t.id || `${t.reference_id || "tx"}-${index}`}>
                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: isLast ? "none" : "1px solid #eef2f7"
                          }}
                        >
                          {formatDate(t.created_at)}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: isLast ? "none" : "1px solid #eef2f7"
                          }}
                        >
                          {getTypeLabel(t.reference_type)}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: isLast ? "none" : "1px solid #eef2f7",
                            wordBreak: "break-word"
                          }}
                        >
                          {t.reference_id || "—"}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: isLast ? "none" : "1px solid #eef2f7"
                          }}
                        >
                          {getDirectionLabel(t.direction)}
                        </td>

                        <td
                          style={{
                            padding: "12px 10px",
                            borderBottom: isLast ? "none" : "1px solid #eef2f7",
                            fontWeight: 600
                          }}
                        >
                          {money(t.amount)}
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