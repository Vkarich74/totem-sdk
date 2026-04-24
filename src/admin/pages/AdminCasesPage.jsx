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

function getStatusForAction(action){
  if (action === "approve") return "approved"
  if (action === "reject") return "rejected"
  if (action === "close") return "closed"
  return ""
}

export default function AdminCasesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadCasesNow() {
    setError("")

    const token = getAuthToken()
    if (!token) {
      setItems([])
      setError("NO_AUTH")
      return
    }

    const response = await fetch(`${API_BASE}/internal/admin/moderation`, {
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
    setItems(list)
  }

  useEffect(() => {
    let cancelled = false

    async function loadCases() {
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

        const response = await fetch(`${API_BASE}/internal/admin/moderation`, {
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

    loadCases()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleAction(id, action) {
    try {
      setError("")

      const token = getAuthToken()
      if (!token) {
        setItems([])
        setError("NO_AUTH")
        return
      }

      const response = await fetch(`${API_BASE}/internal/admin/moderation/${id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      })

      const payload = await response.json()

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `HTTP_${response.status}`)
      }

      const status = getStatusForAction(action)
      const statusResponse = await fetch(`${API_BASE}/internal/admin/moderation/${id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      const statusPayload = await statusResponse.json()

      if (!statusResponse.ok || statusPayload?.ok === false) {
        throw new Error(statusPayload?.error || `HTTP_${statusResponse.status}`)
      }

      await loadCasesNow()
    } catch (e) {
      setError(e?.message || "ACTION_FAILED")
    }
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Загрузка...</div>
  }

  if (error) {
    if (error === "NO_AUTH" || error === "HTTP_401" || error === "HTTP_403") {
      return (
        <div style={{ padding: 20 }}>
          <AdminNavigation />
          <div>Требуется вход администратора</div>
        </div>
      )
    }

    return <div style={{ padding: 20 }}>Ошибка: {error}</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <AdminNavigation />
      <h1 style={{ margin: "0 0 16px" }}>Кейсы</h1>

      {items.length === 0 ? (
        <div>Кейсов нет</div>
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
              <div><strong>lead_id:</strong> {item.lead_runtime_id || item.lead_id || "-"}</div>
              <div><strong>status:</strong> {item.status || "-"}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => handleAction(item.id, "approve")}>
                  Approve
                </button>
                <button type="button" onClick={() => handleAction(item.id, "reject")}>
                  Reject
                </button>
                <button type="button" onClick={() => handleAction(item.id, "close")}>
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
