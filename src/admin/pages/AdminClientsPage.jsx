import { useEffect, useMemo, useState } from "react"
import AdminNavigation from "../AdminNavigation"

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "")

function getAuthToken(){
  try{
    return (window.localStorage.getItem("TOTEM_AUTH_TOKEN") || "").trim()
  }catch(e){
    return ""
  }
}

function formatDateTime(value){
  if(!value){
    return "-"
  }

  try{
    const date = new Date(value)
    if(Number.isNaN(date.getTime())){
      return String(value)
    }

    return date.toLocaleString("ru-RU", {
      timeZone: "Asia/Bishkek",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }catch(e){
    return String(value || "-")
  }
}

function normalizeClientsPayload(payload){
  if(Array.isArray(payload?.data?.items)){
    return payload.data.items
  }

  if(Array.isArray(payload?.clients)){
    return payload.clients
  }

  if(Array.isArray(payload?.items)){
    return payload.items
  }

  return []
}

export default function AdminClientsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadClients() {
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

        const response = await fetch(`${API_BASE}/internal/admin/clients`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        const payload = await response.json()

        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || `HTTP_${response.status}`)
        }

        const list = normalizeClientsPayload(payload)

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

    loadClients()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    if(!query){
      return items
    }

    return items.filter((item) => {
      const text = [
        item?.id,
        item?.name,
        item?.phone,
        item?.salon_slug,
        item?.salon_name,
        item?.bookings_total,
        item?.last_booking_at,
      ].join(" ").toLowerCase()

      return text.includes(query)
    })
  }, [items, search])

  const stats = useMemo(() => {
    return items.reduce((acc, item) => {
      const bookingsTotal = Number(item?.bookings_total || 0)

      acc.clients += 1
      acc.withBookings += bookingsTotal > 0 ? 1 : 0
      acc.withoutPhone += item?.phone ? 0 : 1
      acc.bookingsTotal += Number.isFinite(bookingsTotal) ? bookingsTotal : 0

      return acc
    }, {
      clients: 0,
      withBookings: 0,
      withoutPhone: 0,
      bookingsTotal: 0,
    })
  }, [items])

  if (loading) {
    return <div style={{ padding: 20 }}>Загрузка...</div>
  }

  if (error) {
    if (error === "NO_AUTH" || error === "HTTP_401" || error === "HTTP_403") {
      return (
        <div style={{ padding: 20 }}>
          <AdminNavigation />
          <div>Требуется вход администратора</div>
          <a href="#/admin/login?returnTo=/admin/clients">Войти как администратор</a>
        </div>
      )
    }

    return <div style={{ padding: 20 }}>Ошибка: {error}</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <AdminNavigation />
      <h1 style={{ margin: "0 0 16px" }}>Клиенты</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Клиенты</div>
          <div style={styles.statValue}>{stats.clients}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>С booking</div>
          <div style={styles.statValue}>{stats.withBookings}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Без телефона</div>
          <div style={styles.statValue}>{stats.withoutPhone}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Всего booking</div>
          <div style={styles.statValue}>{stats.bookingsTotal}</div>
        </div>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Поиск по клиенту, телефону, салону"
        style={{
          width: "100%",
          maxWidth: 420,
          boxSizing: "border-box",
          padding: "10px 12px",
          marginBottom: 16,
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      />

      {filteredItems.length === 0 ? (
        <div>Клиентов нет</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div><strong>id:</strong> {item.id || "-"}</div>
              <div><strong>name:</strong> {item.name || "-"}</div>
              <div><strong>phone:</strong> {item.phone || "-"}</div>
              <div><strong>salon:</strong> {item.salon_slug || item.salon_name || "-"}</div>
              <div><strong>bookings_total:</strong> {item.bookings_total ?? 0}</div>
              <div><strong>last_booking_at:</strong> {formatDateTime(item.last_booking_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  statCard: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 12,
    background: "#fff",
  },
  statLabel: {
    color: "#666",
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
  },
}
