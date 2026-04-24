import { useEffect, useState } from "react"

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "")

function getAuthToken(){
  try{
    return (window.localStorage.getItem("TOTEM_AUTH_TOKEN") || "").trim()
  }catch(e){
    return ""
  }
}

function AdminNavigation(){
  return (
    <div style={{ marginBottom: 16 }}>
      <a href="#/admin/messages">Сообщения</a>
      <span> | </span>
      <a href="#/admin/leads">Лиды</a>
      <span> | </span>
      <a href="#/admin/cases">Кейсы</a>
      <span> | </span>
      <a href="#/admin/login">Логин</a>
    </div>
  )
}

export default function AdminLeadsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadLeads() {
      try {
        setLoading(true)
        setError("")

        const token = getAuthToken()
        if (!token) {
          if (!cancelled) {
            setItems([])
            setError("NO_AUTH")
          }
          return
        }

        const response = await fetch(`${API_BASE}/internal/admin/leads`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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

    loadLeads()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div style={{ padding: 20 }}>Загрузка...</div>
  }

  if (error) {
    if (error === "NO_AUTH" || error === "HTTP_401" || error === "HTTP_403") {
      return (
        <div style={{ padding: 20 }}>
          <AdminNavigation />
          <div>Требуется вход администратора</div>
          <a href="#/admin/login?returnTo=/admin/leads">Войти как администратор</a>
        </div>
      )
    }

    return <div style={{ padding: 20 }}>Ошибка: {error}</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <AdminNavigation />
      <h1 style={{ margin: "0 0 16px" }}>Лиды</h1>

      {items.length === 0 ? (
        <div>Лидов нет</div>
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
              <div><strong>id:</strong> {item.id || "-"}</div>
              <div><strong>lead_type:</strong> {item.lead_type || "-"}</div>
              <div><strong>name:</strong> {item.name || "-"}</div>
              <div><strong>phone:</strong> {item.phone || "-"}</div>
              <div><strong>source:</strong> {item.source || "-"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
