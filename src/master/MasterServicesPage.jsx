import { useEffect, useMemo, useState } from "react"
import MasterSidebar from "./MasterSidebar"
import { getMasterServices } from "../api/master"

function getSlugFromHash() {
  const hash = window.location.hash || ""
  const clean = hash.startsWith("#") ? hash.slice(1) : hash
  const parts = clean.split("/")
  return parts[2] || ""
}

function formatPrice(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return `${n} сом`
}

function formatDuration(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return `${n} мин`
}

export default function MasterServicesPage() {
  const slug = useMemo(() => getSlugFromHash(), [])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError("")

        const response = await getMasterServices(slug)
        const services = Array.isArray(response?.services) ? response.services : []

        if (mounted) {
          setItems(services)
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Не удалось загрузить услуги")
          setItems([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    if (!slug) {
      setError("MASTER_SLUG_REQUIRED")
      setLoading(false)
      return
    }

    load()

    return () => {
      mounted = false
    }
  }, [slug])

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "#fff"
    }}>
      <MasterSidebar slug={slug} />

      <div style={{
        flex: 1,
        padding: "24px"
      }}>
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{
            margin: 0,
            fontSize: "28px",
            lineHeight: 1.2
          }}>
            Услуги
          </h1>

          <div style={{
            marginTop: "8px",
            fontSize: "14px",
            color: "#666"
          }}>
            Базовый список услуг мастера
          </div>
        </div>

        {loading && (
          <div style={{
            padding: "16px",
            border: "1px solid #eee",
            borderRadius: "12px",
            background: "#fafafa"
          }}>
            Загрузка...
          </div>
        )}

        {!loading && error && (
          <div style={{
            padding: "16px",
            border: "1px solid #f0d0d0",
            borderRadius: "12px",
            background: "#fff7f7",
            color: "#a33"
          }}>
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div style={{
            padding: "16px",
            border: "1px solid #eee",
            borderRadius: "12px",
            background: "#fafafa"
          }}>
            У мастера пока нет активных услуг.
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div style={{
            border: "1px solid #eee",
            borderRadius: "16px",
            overflow: "hidden"
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.8fr",
              gap: "12px",
              padding: "14px 16px",
              background: "#fafafa",
              borderBottom: "1px solid #eee",
              fontSize: "12px",
              color: "#777",
              fontWeight: 600
            }}>
              <div>Услуга</div>
              <div>Цена</div>
              <div>Длительность</div>
              <div>Статус</div>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.8fr",
                  gap: "12px",
                  padding: "16px",
                  borderBottom: "1px solid #f3f3f3",
                  alignItems: "center"
                }}
              >
                <div style={{ fontWeight: 500 }}>{item.name || "Без названия"}</div>
                <div>{formatPrice(item.price)}</div>
                <div>{formatDuration(item.duration_min)}</div>
                <div>{item.active ? "Активна" : "Выключена"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
