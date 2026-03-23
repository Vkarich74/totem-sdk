import { useEffect, useState } from "react"
import { getMasterServices } from "../api/master"

function getSlugFromHash() {
  const hash = window.location.hash || ""
  const clean = hash.startsWith("#") ? hash.slice(1) : hash
  const parts = clean.split("/")
  return parts[2] || ""
}

export default function MasterServicesPage() {

  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const slug = getSlugFromHash()

  useEffect(() => {

    async function load() {
      try {

        const res = await getMasterServices(slug)

        setServices(res.services || [])
        setLoading(false)

      } catch (e) {

        setError("Ошибка загрузки")
        setLoading(false)

      }
    }

    if (slug) {
      load()
    }

  }, [slug])

  return (

    <div style={{ padding: "20px" }}>

      <h1>Услуги</h1>

      {loading && <div>Загрузка...</div>}

      {error && <div>{error}</div>}

      {!loading && services.length === 0 && (
        <div>У мастера пока нет активных услуг.</div>
      )}

      {!loading && services.length > 0 && (
        <div>

          {services.map(s => (
            <div key={s.id} style={{
              padding: "10px",
              borderBottom: "1px solid #eee"
            }}>
              <div><b>{s.name}</b></div>
              <div>{s.price} сом</div>
              <div>{s.duration_min} мин</div>
            </div>
          ))}

        </div>
      )}

    </div>

  )

}