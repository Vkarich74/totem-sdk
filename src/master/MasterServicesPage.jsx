import { useMemo, useState } from "react"
import { createMasterService } from "../api/master"

const PRESET_SERVICES = [
  { key: "service_1", label: "Услуга 1" },
  { key: "service_2", label: "Услуга 2" },
  { key: "service_3", label: "Услуга 3" },
  { key: "service_4", label: "Услуга 4" },
  { key: "service_5", label: "Услуга 5" },
  { key: "service_6", label: "Услуга 6" },
  { key: "service_7", label: "Услуга 7" },
  { key: "service_8", label: "Услуга 8" },
  { key: "service_9", label: "Услуга 9" },
  { key: "service_10", label: "Услуга 10" }
]

function buildInitialState() {
  const state = {}

  for (const item of PRESET_SERVICES) {
    state[item.key] = {
      checked: false,
      duration_min: ""
    }
  }

  return state
}

function getSlugFromHash() {
  const hash = window.location.hash || ""
  const clean = hash.replace(/^#\/?/, "")
  const parts = clean.split("/")
  return parts[1] === "master" ? parts[2] || "" : ""
}

export default function MasterServicesPage() {
  const [form, setForm] = useState(buildInitialState())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const slug = useMemo(() => getSlugFromHash(), [])

  const selectedServices = useMemo(() => {
    return PRESET_SERVICES.filter((item) => form[item.key]?.checked)
  }, [form])

  const selectedCount = selectedServices.length

  function toggleService(key) {
    setError("")
    setSuccess("")

    setForm((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        checked: !prev[key].checked
      }
    }))
  }

  function setDuration(key, value) {
    setError("")
    setSuccess("")

    setForm((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        duration_min: value
      }
    }))
  }

  function resetForm() {
    setForm(buildInitialState())
  }

  function validate() {
    if (!slug) {
      return "MASTER_SLUG_REQUIRED"
    }

    if (selectedCount === 0) {
      return "Выбери хотя бы одну услугу"
    }

    for (const item of selectedServices) {
      const duration = Number(form[item.key].duration_min)

      if (!Number.isFinite(duration) || duration <= 0) {
        return `Укажи корректную длительность для: ${item.label}`
      }
    }

    return ""
  }

  async function handleSave() {
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
      for (const item of selectedServices) {
        await createMasterService(slug, {
          name: item.label,
          duration_min: Number(form[item.key].duration_min),
          price: 0
        })
      }

      setSuccess(`Сохранено услуг: ${selectedCount}`)
      resetForm()

    } catch (e) {
      setError(e?.message || "Ошибка сохранения услуг")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "20px"
    }}>

      <div>
        <h1 style={{
          margin: 0,
          fontSize: "28px",
          lineHeight: 1.2
        }}>
          Услуги
        </h1>

        <div style={{
          color: "#666",
          marginTop: "8px",
          fontSize: "14px"
        }}>
          Выбери услуги мастера для кабинета. Разрешён мультивыбор, у каждой услуги своё время.
        </div>
      </div>

      <div style={{
        display: "grid",
        gap: "14px"
      }}>
        {PRESET_SERVICES.map((item) => {
          const row = form[item.key]

          return (
            <div
              key={item.key}
              style={{
                border: "1px solid #e7e7e7",
                borderRadius: "14px",
                background: "#fff",
                padding: "16px"
              }}
            >
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer"
              }}>
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={() => toggleService(item.key)}
                />

                <span style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#111"
                }}>
                  {item.label}
                </span>
              </label>

              {row.checked && (
                <div style={{
                  marginTop: "14px",
                  paddingLeft: "28px"
                }}>
                  <div style={{
                    fontSize: "13px",
                    color: "#666",
                    marginBottom: "6px"
                  }}>
                    Длительность
                  </div>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={row.duration_min}
                    onChange={(e) => setDuration(item.key, e.target.value)}
                    placeholder="Например 60"
                    style={{
                      width: "220px",
                      padding: "10px 12px",
                      border: "1px solid #d9d9d9",
                      borderRadius: "10px",
                      outline: "none"
                    }}
                  />

                  <div style={{
                    fontSize: "12px",
                    color: "#888",
                    marginTop: "8px"
                  }}>
                    Время задаётся отдельно для каждой выбранной услуги
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{
        border: "1px solid #e7e7e7",
        borderRadius: "14px",
        background: "#fafafa",
        padding: "18px"
      }}>
        <div style={{
          fontWeight: "600",
          marginBottom: "10px"
        }}>
          Выбрано услуг: {selectedCount}
        </div>

        {error && (
          <div style={{
            marginBottom: "12px",
            color: "#b42318",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            marginBottom: "12px",
            color: "#067647",
            fontSize: "14px"
          }}>
            {success}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
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
          {saving ? "Сохраняем..." : "Сохранить выбранные услуги"}
        </button>
      </div>

    </div>
  )
}
