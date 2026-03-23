import { useMemo, useState } from "react"

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

export default function MasterServicesPage() {
  const [form, setForm] = useState(buildInitialState())

  const selectedCount = useMemo(() => {
    return Object.values(form).filter((item) => item.checked).length
  }, [form])

  function toggleService(key) {
    setForm((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        checked: !prev[key].checked
      }
    }))
  }

  function setDuration(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        duration_min: value
      }
    }))
  }

  return (
    <div style={{ padding: "20px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0 }}>Услуги</h1>
        <div style={{ color: "#666", marginTop: "8px" }}>
          Выбери услуги мастера. Сейчас: мультивыбор из 10 позиций.
        </div>
      </div>

      <div style={{
        border: "1px solid #e5e5e5",
        borderRadius: "12px",
        padding: "16px",
        background: "#fff",
        marginBottom: "20px"
      }}>
        <div style={{
          fontWeight: "600",
          marginBottom: "12px"
        }}>
          Выбор услуг
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "12px"
        }}>
          {PRESET_SERVICES.map((item) => {
            const row = form[item.key]

            return (
              <div
                key={item.key}
                style={{
                  border: "1px solid #eee",
                  borderRadius: "10px",
                  padding: "12px"
                }}
              >
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontWeight: "500"
                }}>
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={() => toggleService(item.key)}
                  />
                  <span>{item.label}</span>
                </label>

                {row.checked && (
                  <div style={{
                    marginTop: "12px",
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
                        width: "180px",
                        padding: "10px",
                        border: "1px solid #ddd",
                        borderRadius: "8px"
                      }}
                    />

                    <div style={{
                      fontSize: "12px",
                      color: "#888",
                      marginTop: "6px"
                    }}>
                      Время у каждой выбранной услуги задаётся отдельно
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{
        border: "1px solid #e5e5e5",
        borderRadius: "12px",
        padding: "16px",
        background: "#fafafa"
      }}>
        <div style={{ fontWeight: "600", marginBottom: "10px" }}>
          Итого выбрано: {selectedCount}
        </div>

        <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
          Названия услуг позже заменим на финальные. Сейчас собран чистый UI под 10 чекбоксов и мультивыбор.
        </div>

        <button
          type="button"
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            background: "#f2f2f2",
            cursor: "not-allowed"
          }}
          disabled
        >
          Сохранение подключим следующим шагом
        </button>
      </div>

    </div>
  )
}
