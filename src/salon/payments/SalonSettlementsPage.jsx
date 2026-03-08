import { useEffect, useState } from "react"

export default function SalonSettlementsPage() {

  const [loading, setLoading] = useState(true)
  const [settlements, setSettlements] = useState([])
  const [error, setError] = useState(null)

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
          setError("Salon slug not found")
          setLoading(false)
          return
        }

        const response = await fetch(
          `https://api.totemv.com/internal/salons/${slug}/settlements`
        )

        if (!response.ok) {
          throw new Error("API_ERROR")
        }

        const data = await response.json()

        if (data && data.ok && data.settlements) {
          setSettlements(data.settlements)
        } else {
          setSettlements([])
        }

      } catch (e) {

        console.error("SETTLEMENTS_FETCH_ERROR", e)

        setError("SETTLEMENTS_FETCH_FAILED")

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

  if (error) {
    return (
      <div>
        <h1>Сеты салона</h1>
        <p>Ошибка загрузки расчетов</p>
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

      <div>

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

            <div>
              <strong>ID:</strong> {s.id}
            </div>

            <div>
              <strong>Период:</strong> {s.period_start} → {s.period_end}
            </div>

            <div>
              <strong>Сумма:</strong> {s.amount}
            </div>

            <div>
              <strong>Статус:</strong> {s.status}
            </div>

          </div>
        ))}

      </div>

    </div>
  )
}