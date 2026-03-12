import { useEffect, useState } from "react"

import PageSection from "../../cabinet/PageSection"
import TableSection from "../../cabinet/TableSection"
import EmptyState from "../../cabinet/EmptyState"

const API_BASE = import.meta.env.VITE_API_BASE


function getMasterSlug() {

  if (window.MASTER_SLUG) {
    return window.MASTER_SLUG
  }

  const parts = window.location.pathname.split("/")

  if (parts.length >= 3 && parts[1] === "salon") {
    return parts[2]
  }

  if (parts.length >= 3 && parts[1] === "master") {
    return parts[2]
  }

  return null
}


function money(value) {

  const n = Number(value) || 0

  return new Intl.NumberFormat("ru-RU").format(n) + " сом"

}


function formatDate(iso) {

  const d = new Date(iso)

  return (
    d.toLocaleDateString("ru-RU") +
    " " +
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  )

}


export default function MasterSettlementsPage() {

  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)


  useEffect(() => {

    async function loadSettlements() {

      try {

        const slug = getMasterSlug()

        if (!slug) {
          console.error("MASTER_SLUG_NOT_FOUND")
          setLoading(false)
          return
        }

        const res = await fetch(
          `${API_BASE}/internal/masters/${slug}/settlements`
        )

        if (!res.ok) {
          throw new Error("SETTLEMENTS_FETCH_FAILED")
        }

        const data = await res.json()

        setPeriods(data.periods || [])

      } catch (e) {

        console.error("Settlements load error", e)

      } finally {

        setLoading(false)

      }

    }

    loadSettlements()

  }, [])


  return (

    <PageSection title="Сеты">

      {loading && <div>Загрузка...</div>}

      {!loading && periods.length === 0 && (
        <EmptyState text="Расчетных периодов пока нет" />
      )}

      {!loading && periods.length > 0 && (

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

              {periods.map(p => (

                <tr key={p.id}>

                  <td>{p.id}</td>

                  <td>{formatDate(p.start_date)}</td>

                  <td>{formatDate(p.end_date)}</td>

                  <td>{money(p.amount)}</td>

                  <td>{p.status}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </TableSection>

      )}

    </PageSection>

  )

}