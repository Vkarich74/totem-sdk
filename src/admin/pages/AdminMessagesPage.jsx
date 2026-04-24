import { useEffect, useState } from "react"

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "")

function getAuthToken(){
  try{
    return (window.localStorage.getItem("TOTEM_AUTH_TOKEN") || "").trim()
  }catch(e){
    return ""
  }
}

function getStatusStyle(status){
  const base = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  }

  if (status === "sent") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    }
  }

  if (status === "failed") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    }
  }

  if (status === "pending") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
    }
  }

  return {
    ...base,
    background: "#f3f4f6",
    color: "#374151",
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
        if (!token) {
          if (!cancelled) {
            setItems([])
            setError("NO_AUTH")
          }
          return
        }

        const response = await fetch(`${API_BASE}/internal/admin/messages`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        const payload = await response.json()

        if (!response.ok || payload?.ok === false) {
          const code = payload?.error || `HTTP_${response.status}`

          if (
            code === "NO_AUTH" ||
            code === "HTTP_401" ||
            code === "HTTP_403"
          ) {
            if (!cancelled) {
              setItems([])
              setError(code)
            }
            return
          }

          throw new Error(code)
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

  async function loadMessagesNow() {
    setError("")

    const token = getAuthToken()
    if (!token) {
      setItems([])
      setError("NO_AUTH")
      return
    }

    const response = await fetch(`${API_BASE}/internal/admin/messages`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    const payload = await response.json()

    if (!response.ok || payload?.ok === false) {
      const code = payload?.error || `HTTP_${response.status}`

      if (
        code === "NO_AUTH" ||
        code === "HTTP_401" ||
        code === "HTTP_403"
      ) {
        setItems([])
        setError(code)
        return
      }

      throw new Error(code)
    }

    const list = Array.isArray(payload?.data?.items) ? payload.data.items : []
    setItems(list)
    setLoading(false)
  }

  async function handleRetry(id) {
    console.log("RETRY_START", id)

    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/internal/admin/messages/${id}/retry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      const payload = await response.json()

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `HTTP_${response.status}`)
      }

      await loadMessagesNow()
    } catch (e) {
      setError(e?.message || "RETRY_FAILED")
      setLoading(false)
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
          <a href="#/admin/login?returnTo=/admin/messages">Войти как администратор</a>
        </div>
      )
    }

    return <div style={{ padding: 20 }}>Ошибка: {error}</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <AdminNavigation />
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
              <div>
                <strong>status:</strong>{" "}
                <span style={getStatusStyle(item.status)}>{item.status || "—"}</span>
              </div>
              <button
                type="button"
                disabled={false}
                onClick={() => {
                  console.log("RETRY_CLICK", item.id)
                  handleRetry(item.id)
                }}
                style={{ marginTop: 8, cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
