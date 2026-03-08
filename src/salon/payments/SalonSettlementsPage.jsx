import { useEffect, useState } from "react"

export default function SalonSettlementsPage() {

  const [loading, setLoading] = useState(true)
  const [settlements, setSettlements] = useState([])

  useEffect(() => {

    async function loadSettlements() {

      try {

        const path = window.location.pathname
        const parts = path.split("/")

        let slug = null

        const salonIndex = parts.indexOf("salon")

        if (salonIndex !== -1 && parts.length > salonIndex + 1) {
          slug = parts[salonIndex + 1]
        }

        if (!slug) {
          setLoading(false)
          return
        }

        const response = await fetch(
          `https://api.totemv.com/internal/salons/${slug}/settlements`
        )

        if (!response.ok) {

          // endpoint не существует
          setSettlements([])
          setLoading(false)
          return
        }

        const data = await response.json()

        if (data && data.ok && data.settlements) {
          setSettlements(data.settlements)
        }

      } catch (e) {

        console.log("SETTLEMENTS API NOT AVAILABLE")

      } finally {

        setLoading(false)

      }
    }

    loadSettlements()

  }, [])

  if (loading) {
    return (
      <div>
        <h1>Сеты салона</h1>
        <p>Загрузка расчетов...</p>
      </div>
    )
  }

  if (!settlements.length) {
    return (
      <div>
        <h1>Сеты салона</h1>
        <p>Расчёты пока отсутствуют</p>
      </div>
    )
  }

  return (
    <div>

      <h1>Сеты салона</h1>

      {settlements.map((s) => (
        <div
          key={s.id}
          style={{
            border: "1px solid #ddd",
            padding: "12px",
            marginBottom: "10px",
            borderRadius: "6px"
          }}
        >

          <div><strong>ID:</strong> {s.id}</div>
          <div><strong>Период:</strong> {s.period_start} → {s.period_end}</div>
          <div><strong>Сумма:</strong> {s.amount}</div>
          <div><strong>Статус:</strong> {s.status}</div>

        </div>
      ))}

    </div>
  )
}