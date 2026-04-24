import { useEffect, useState } from "react"

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "")

function getAuthToken(){
  try{
    return (
      window.localStorage.getItem("TOTEM_AUTH_TOKEN") ||
      window.localStorage.getItem("TOTEM_ACCESS_TOKEN") ||
      window.localStorage.getItem("TOTEM_INTERNAL_TOKEN") ||
      ""
    ).trim()
  }catch(e){
    return ""
  }
}

export default function AdminMessagesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadMessages() {
      try {
        setLoading(true)
        setError("")

        const token = getAuthToken()
        const response = await fetch(`${API_BASE}/internal/admin/messages`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        })

        const payload = await response.json()

        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || `HTTP_${response.status}`)
        }

        const list = Array.isArray(payload?.data?.items) ? payload.data.items : []

        if (!cancelled) {
          setItems(list)
        }
      } catch (e) {
        if (!cancelled) {
          setItems([])
          setError(e?.message || "LOAD_FAILED")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMessages()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div style={{ padding: 20 }}>Загрузка...</div>
  }

  if (error) {
    return <div style={{ padding: 20 }}>Ошибка: {error}</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ margin: "0 0 16px" }}>Сообщения</h1>

      {items.length === 0 ? (
        <div>Сообщений нет</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div><strong>id:</strong> {item.id || "—"}</div>
              <div><strong>channel:</strong> {item.channel || "—"}</div>
              <div><strong>recipient_type:</strong> {item.recipient_type || "—"}</div>
              <div><strong>status:</strong> {item.status || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
