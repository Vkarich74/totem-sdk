import { useEffect, useMemo, useState } from "react"
import { createMasterService, getMasterServices, updateMasterService } from "../api/master"

const QUICK_TEMPLATES = [
  { name: "Женская стрижка", duration_min: 60, price: 0 },
  { name: "Мужская стрижка", duration_min: 45, price: 0 },
  { name: "Окрашивание", duration_min: 120, price: 0 },
  { name: "Укладка", duration_min: 45, price: 0 },
  { name: "Уход за волосами", duration_min: 60, price: 0 },
  { name: "Мелирование", duration_min: 150, price: 0 }
]

function getSlugFromHash() {
  const hash = window.location.hash || ""
  const clean = hash.replace(/^#\/?/, "")
  const parts = clean.split("/").filter(Boolean)

  if (parts[0] === "master") {
    if (parts[1] && parts[1] !== "services") {
      return parts[1]
    }

    const storedSlug =
      window.localStorage.getItem("totem_master_slug") ||
      window.sessionStorage.getItem("totem_master_slug")

    if (storedSlug) {
      return storedSlug
    }
  }

  return "totem-demo-master"
}

function normalizeServicesResponse(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.services)) {
    return payload.services
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  return []
}

function formatPrice(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return "—"
  }

  return `${numberValue.toLocaleString("ru-RU")} сом`
}

function formatDuration(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "—"
  }

  return `${numberValue} мин`
}

function getServiceKey(service, index) {
  return service?.id || service?.service_id || `${service?.name || "service"}-${index}`
}

export default function MasterServicesPage() {
  const slug = useMemo(() => getSlugFromHash(), [])

  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState({
    name: "",
    duration_min: "",
    price: ""
  })
  const [editingId, setEditingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  async function loadServices() {
    setLoading(true)
    setError("")

    try {
      const response = await getMasterServices(slug)
      const normalized = normalizeServicesResponse(response)
      setServices(normalized)
    } catch (e) {
      setError(e?.message || "Не удалось загрузить услуги")
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [slug])

  function updateForm(field, value) {
    setError("")
    setSuccess("")

    setForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  function applyTemplate(template) {
    setError("")
    setSuccess("")
    setForm({
      name: template.name,
      duration_min: String(template.duration_min),
      price: String(template.price)
    })
  }

  function resetForm() {
    setForm({
      name: "",
      duration_min: "",
      price: ""
    })
    setEditingId(null)
  }

  function validate() {
    const name = String(form.name || "").trim()
    const duration = Number(form.duration_min)
    const price = Number(form.price)

    if (!name) {
      return "Укажи название услуги"
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      return "Укажи корректную длительность"
    }

    if (!Number.isFinite(price) || price < 0) {
      return "Укажи корректную цену"
    }

    return ""
  }

  async function handleCreate(e) {
    e.preventDefault()

    const validationError = validate()

    if (validationError) {
      setError(validationError)
      setSuccess("")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const payload = {
        name: String(form.name || "").trim(),
        duration_min: Number(form.duration_min),
        price: Number(form.price)
      }

      if (editingId) {
        await updateMasterService(slug, editingId, payload)
        setSuccess("Услуга обновлена")
      } else {
        await createMasterService(slug, payload)
        setSuccess("Услуга добавлена")
      }

      resetForm()
      await loadServices()
    } catch (e) {
      setError(e?.message || "Не удалось сохранить услугу")
    } finally {
      setSaving(false)
    }
  }

  function startEdit(service) {
    setError("")
    setSuccess("")
    setEditingId(service?.id || service?.service_id || null)
    setForm({
      name: String(service?.name || ""),
      duration_min: String(service?.duration_min ?? service?.duration ?? service?.minutes ?? ""),
      price: String(service?.price ?? service?.base_price ?? "")
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function toggleActive(service) {
    const serviceId = service?.id || service?.service_id

    if (!serviceId) {
      setError("Не найден id услуги")
      setSuccess("")
      return
    }

    setTogglingId(serviceId)
    setError("")
    setSuccess("")

    try {
      await updateMasterService(slug, serviceId, {
        active: !(service?.active ?? service?.is_active ?? true)
      })

      setSuccess("Статус услуги обновлён")
      await loadServices()
    } catch (e) {
      setError(e?.message || "Не удалось изменить статус услуги")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            lineHeight: 1.2
          }}
        >
          Услуги
        </h1>

        <div
          style={{
            color: "#666",
            marginTop: "8px",
            fontSize: "14px"
          }}
        >
          Управляй реальными услугами мастера: добавляй, смотри список и поддерживай актуальный каталог для профиля.
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e7e7e7",
          borderRadius: "14px",
          background: "#fff",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}
      >
        <div
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#111"
          }}
        >
          Быстро заполнить
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          {QUICK_TEMPLATES.map((template) => (
            <button
              key={template.name}
              type="button"
              onClick={() => applyTemplate(template)}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #d9d9d9",
                background: "#fafafa",
                color: "#111",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              {template.name}
            </button>
          ))}
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#777"
          }}
        >
          Шаблон только заполняет форму. В систему сохраняется реальная услуга после нажатия кнопки добавления.
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        style={{
          border: "1px solid #e7e7e7",
          borderRadius: "14px",
          background: "#fff",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#111"
          }}
        >
          {editingId ? "Редактировать услугу" : "Добавить услугу"}
        </div>

        <div
          style={{
            display: "grid",
            gap: "14px",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
          }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#666",
                marginBottom: "6px"
              }}
            >
              Название
            </div>

            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder="Например, Окрашивание"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d9d9d9",
                borderRadius: "10px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#666",
                marginBottom: "6px"
              }}
            >
              Длительность, мин
            </div>

            <input
              type="number"
              min="1"
              step="1"
              value={form.duration_min}
              onChange={(e) => updateForm("duration_min", e.target.value)}
              placeholder="Например, 60"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d9d9d9",
                borderRadius: "10px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#666",
                marginBottom: "6px"
              }}
            >
              Цена
            </div>

            <input
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => updateForm("price", e.target.value)}
              placeholder="Например, 1500"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d9d9d9",
                borderRadius: "10px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              color: "#b42318",
              fontSize: "14px"
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              color: "#067647",
              fontSize: "14px"
            }}
          >
            {success}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap"
          }}
        >
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid #d0d0d0",
              background: saving ? "#f2f2f2" : "#111",
              color: saving ? "#777" : "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: "600"
            }}
          >
            {saving ? "Сохраняем..." : editingId ? "Сохранить изменения" : "Добавить услугу"}
          </button>

          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid #d0d0d0",
              background: "#fff",
              color: "#111",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: "600"
            }}
          >
            {editingId ? "Отмена" : "Очистить"}
          </button>
        </div>
      </form>

      <div
        style={{
          border: "1px solid #e7e7e7",
          borderRadius: "14px",
          background: "#fafafa",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <div
            style={{
              fontWeight: "600",
              color: "#111"
            }}
          >
            Мои услуги
          </div>

          <button
            type="button"
            onClick={loadServices}
            disabled={loading}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #d0d0d0",
              background: "#fff",
              color: "#111",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "600"
            }}
          >
            {loading ? "Обновляем..." : "Обновить список"}
          </button>
        </div>

        {loading ? (
          <div
            style={{
              color: "#666",
              fontSize: "14px"
            }}
          >
            Загружаем услуги...
          </div>
        ) : services.length === 0 ? (
          <div
            style={{
              color: "#666",
              fontSize: "14px"
            }}
          >
            Пока нет ни одной услуги. Добавь первую услугу через форму выше.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px"
            }}
          >
            {services.map((service, index) => {
              const key = getServiceKey(service, index)
              const name = service?.name || "Без названия"
              const duration = service?.duration_min ?? service?.duration ?? service?.minutes
              const price = service?.price ?? service?.base_price ?? 0
              const statusValue = service?.active ?? service?.is_active
              const isActive = typeof statusValue === "boolean" ? statusValue : true

              return (
                <div
                  key={key}
                  style={{
                    border: "1px solid #e7e7e7",
                    borderRadius: "12px",
                    background: "#fff",
                    padding: "16px",
                    display: "grid",
                    gap: "8px"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#111"
                      }}
                    >
                      {name}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        padding: "6px 10px",
                        borderRadius: "999px",
                        background: isActive ? "#ecfdf3" : "#f2f4f7",
                        color: isActive ? "#067647" : "#667085",
                        border: isActive ? "1px solid #abefc6" : "1px solid #d0d5dd"
                      }}
                    >
                      {isActive ? "Активна" : "Скрыта"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      flexWrap: "wrap",
                      color: "#666",
                      fontSize: "14px"
                    }}
                  >
                    <div>Длительность: {formatDuration(duration)}</div>
                    <div>Цена: {formatPrice(price)}</div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap"
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => startEdit(service)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d0d0d0",
                        background: "#fff",
                        color: "#111",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      Редактировать
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleActive(service)}
                      disabled={togglingId === (service?.id || service?.service_id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d0d0d0",
                        background: "#fff",
                        color: "#111",
                        cursor:
                          togglingId === (service?.id || service?.service_id)
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: "600"
                      }}
                    >
                      {togglingId === (service?.id || service?.service_id)
                        ? "Сохраняем..."
                        : isActive
                          ? "Скрыть"
                          : "Активировать"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
