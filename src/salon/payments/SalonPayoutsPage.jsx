import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

export default function SalonPayoutsPage() {

  const { slug } = useParams()

  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    let cancelled = false

    async function loadPayouts() {

      if (!slug) {
        if (!cancelled) {
          setPayouts([])
          setLoading(false)
        }
        return
      }

      try {

        const res = await fetch(
          `https://api.totemv.com/internal/salons/${slug}/payouts`
        )

        // endpoint может не существовать
        if (!res.ok) {
          if (!cancelled) {
            setPayouts([])
            setLoading(false)
          }
          return
        }

        const data = await res.json()

        if (!cancelled) {

          if (data && data.ok && Array.isArray(data.payouts)) {
            setPayouts(data.payouts)
          } else {
            setPayouts([])
          }

          setLoading(false)
        }

      } catch (err) {

        console.log("PAYOUTS API NOT AVAILABLE")

        if (!cancelled) {
          setPayouts([])
          setLoading(false)
        }

      }

    }

    loadPayouts()

    return () => {
      cancelled = true
    }

  }, [slug])

  if (loading) {
    return (
      <div>
        <h1>Выплаты салона</h1>
        <p>Загрузка выплат...</p>
      </div>
    )
  }

  if (payouts.length === 0) {
    return (
      <div>
        <h1>Выплаты салона</h1>
        <p>Выплаты пока отсутствуют</p>
      </div>
    )
  }

  return (
    <div>

      <h1>Выплаты салона</h1>

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

          {payouts.map((p) => (

            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.created_at || "-"}</td>
              <td>{p.amount || 0}</td>
              <td>{p.status || "-"}</td>
            </tr>

          ))}

        </tbody>

      </table>

    </div>
  )
}