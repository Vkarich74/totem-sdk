import { UiValue, uiMessage, uiMoney, uiTemplate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useState } from "react"
import { useMaster } from "../MasterContext"
import {
  createMasterService,
  deleteMasterService,
  getMasterServices,
  updateMasterService
} from "../../api/master"

const QUICK_TEMPLATES = [
  { name: "Женская стрижка", duration_min: 60, price: 0 },
  { name: "Мужская стрижка", duration_min: 45, price: 0 },
  { name: "Окрашивание", duration_min: 120, price: 0 },
  { name: "Укладка", duration_min: 45, price: 0 },
  { name: "Уход за волосами", duration_min: 60, price: 0 },
  { name: "Мелирование", duration_min: 150, price: 0 }
]

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

function formatPrice(value, currency) { return uiMoney(value, currency); }

function formatDuration(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "—"
  }

  return uiMessage("salon.s0735", {p0: numberValue})
}

function getServiceKey(service, index) {
  return service?.id || service?.service_id || uiTemplate(["","-",""], [service?.name || "service", index])
}

export default function MasterServicesPage() {
  const { renderUi } = useUiMessages();
  const { master, slug: contextSlug } = useMaster() || {}

  const slug = useMemo(() => {
    return master?.slug || contextSlug || null
  }, [master, contextSlug])

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
  const [deletingId, setDeletingId] = useState(null)

  const visibleServices = useMemo(() => {
    const map = new Map()
    services.forEach((s) => {
      const key = s?.service_pk || s?.catalog_service_id || s?.name
      if (!key) return
      map.set(key, s)
    })
    return Array.from(map.values())
  }, [services])

  async function loadServices() {
    if (!slug) {
      setServices([])
      setLoading(false)
      setError(uiError(uiMessage("master.s0201")))
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await getMasterServices(slug)
      const normalized = normalizeServicesResponse(response)
      setServices(normalized)
    } catch (e) {
      setError(uiError(e?.message || uiMessage("master.s0202")))
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!slug) {
      setServices([])
      setLoading(false)
      setError(uiError(uiMessage("master.s0201")))
      return
    }

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
      return uiMessage("master.s0203")
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      return uiMessage("master.s0204")
    }

    if (!Number.isFinite(price) || price < 0) {
      return uiMessage("master.s0205")
    }

    return ""
  }

  async function handleCreate(e) {
    e.preventDefault()

    const validationError = validate()

    if (validationError) {
      setError(uiError(validationError))
      setSuccess("")
      return
    }

    if (!slug) {
      setError(uiError(uiMessage("master.s0201")))
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
        setSuccess(uiMessage("master.s0206"))
      } else {
        await createMasterService(slug, payload)
        setSuccess(uiMessage("master.s0207"))
      }

      resetForm()
      await loadServices()
    } catch (e) {
      setError(uiError(e?.message || uiMessage("master.s0208")))
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
      setError(uiError(uiMessage("master.s0209")))
      setSuccess("")
      return
    }

    if (!slug) {
      setError(uiError(uiMessage("master.s0201")))
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

      setSuccess(uiMessage("master.s0210"))
      await loadServices()
    } catch (e) {
      setError(uiError(e?.message || uiMessage("master.s0211")))
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(service) {
    const serviceId = service?.id || service?.service_id

    if (!serviceId) {
      setError(uiError(uiMessage("master.s0209")))
      setSuccess("")
      return
    }

    if (!slug) {
      setError(uiError(uiMessage("master.s0201")))
      setSuccess("")
      return
    }

    const confirmed = window.confirm(
      renderUi(uiMessage("master.s0212", {p0: service?.name || uiMessage("salon.s0773")}))
    )

    if (!confirmed) {
      return
    }

    setDeletingId(serviceId)
    setError("")
    setSuccess("")

    try {
      await deleteMasterService(slug, serviceId)

      if (editingId === serviceId) {
        resetForm()
      }

      setSuccess(uiMessage("master.s0214"))
      await loadServices()
    } catch (e) {
      setError(uiError(e?.message || uiMessage("master.s0215")))
    } finally {
      setDeletingId(null)
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
        ><UiValue value={uiMessage("master.s0216")} /></h1>

        <div
          style={{
            color: "#666",
            marginTop: "8px",
            fontSize: "14px"
          }}
        ><UiValue value={uiMessage("master.s0217")} /></div>
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
        ><UiValue value={uiMessage("master.s0218")} /></div>

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
              disabled={saving || loading || togglingId !== null || deletingId !== null}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #d9d9d9",
                background: "#fafafa",
                color: "#111",
                cursor: saving || loading || togglingId !== null || deletingId !== null ? "not-allowed" : "pointer",
                opacity: saving || loading || togglingId !== null || deletingId !== null ? 0.6 : 1,
                fontWeight: "500"
              }}
            >
              <UiValue value={QUICK_TEMPLATE_LABELS[template.name] || template.name} />
            </button>
          ))}
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#777"
          }}
        ><UiValue value={uiMessage("master.s0219")} /></div>
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
          <UiValue value={editingId ? uiMessage("master.s0220") : uiMessage("salon.s0601")} />
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
            ><UiValue value={uiMessage("master.s0222")} /></div>

            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder={renderUi(uiMessage("master.s0223"))}
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
            ><UiValue value={uiMessage("master.s0224")} /></div>

            <input
              type="number"
              min="1"
              step="1"
              value={form.duration_min}
              onChange={(e) => updateForm("duration_min", e.target.value)}
              placeholder={renderUi(uiMessage("master.s0225"))}
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
            ><UiValue value={uiMessage("salon.s0779")} /></div>

            <input
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => updateForm("price", e.target.value)}
              placeholder={renderUi(uiMessage("master.s0227"))}
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
            <UiValue value={uiError(error)} />
          </div>
        )}

        {success && (
          <div
            style={{
              color: "#067647",
              fontSize: "14px"
            }}
          >
            <UiValue value={success} />
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
            <UiValue value={saving ? uiMessage("master.s0228") : editingId ? uiMessage("master.s0229") : uiMessage("salon.s0601")} />
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
            <UiValue value={editingId ? uiMessage("master.s0230") : uiMessage("master.s0231")} />
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
          ><UiValue value={uiMessage("master.s0232")} /></div>

          <button
            type="button"
            onClick={loadServices}
            disabled={loading || saving || togglingId !== null || deletingId !== null}
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #d0d0d0",
              background: "#fff",
              color: "#111",
              cursor: loading || saving || togglingId !== null || deletingId !== null ? "not-allowed" : "pointer",
              fontWeight: "600"
            }}
          >
            <UiValue value={loading ? uiMessage("salon.s0431") : uiMessage("master.s0234")} />
          </button>
        </div>

        {loading ? (
          <div
            style={{
              color: "#666",
              fontSize: "14px"
            }}
          ><UiValue value={uiMessage("master.s0235")} /></div>
        ) : visibleServices.length === 0 ? (
          <div
            style={{
              color: "#666",
              fontSize: "14px"
            }}
          ><UiValue value={uiMessage("master.s0236")} /></div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px"
            }}
          >
            {visibleServices.map((service, index) => {
              const serviceId = service?.id || service?.service_id
              const key = getServiceKey(service, index)
              const name = service?.name || uiMessage("salon.s0773")
              const duration = service?.duration_min ?? service?.duration ?? service?.minutes
              const price = service?.price ?? service?.base_price ?? 0
              const statusValue = service?.active ?? service?.is_active
              const isActive = typeof statusValue === "boolean" ? statusValue : true
              const isToggling = togglingId === serviceId
              const isDeleting = deletingId === serviceId

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
                      <UiValue value={name} />
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
                      <UiValue value={isActive ? uiMessage("salon.s0627") : uiMessage("master.s0238")} />
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
                    <div><UiValue value={uiMessage("master.s0239")} /><UiValue value={formatDuration(duration)} /></div>
                    <div><UiValue value={uiMessage("master.s0240")} /><UiValue value={formatPrice(price, service?.currency_code || service?.currency)} /></div>
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
                      disabled={isDeleting || isToggling || saving}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d0d0d0",
                        background: "#fff",
                        color: "#111",
                        cursor: isDeleting || isToggling || saving ? "not-allowed" : "pointer",
                        fontWeight: "600"
                      }}
                    ><UiValue value={uiMessage("master.s0241")} /></button>

                    <button
                      type="button"
                      onClick={() => toggleActive(service)}
                      disabled={isToggling || isDeleting || saving}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #d0d0d0",
                        background: "#fff",
                        color: "#111",
                        cursor: isToggling || isDeleting || saving ? "not-allowed" : "pointer",
                        fontWeight: "600"
                      }}
                    >
                      <UiValue value={isToggling
                        ? uiMessage("master.s0228")
                        : isActive
                          ? uiMessage("master.s0242")
                          : uiMessage("salon.s0430")} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(service)}
                      disabled={isDeleting || isToggling || saving}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid #f0c2c2",
                        background: "#fff5f5",
                        color: "#b42318",
                        cursor: isDeleting || isToggling || saving ? "not-allowed" : "pointer",
                        fontWeight: "600"
                      }}
                    >
                      <UiValue value={isDeleting ? uiMessage("master.s0244") : uiMessage("salon.s0594")} />
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

const QUICK_TEMPLATE_LABELS = { "Женская стрижка": uiMessage("master.s0193"), "Мужская стрижка": uiMessage("master.s0194"), "Окрашивание": uiMessage("master.s0195"), "Укладка": uiMessage("master.s0196"), "Уход за волосами": uiMessage("master.s0197"), "Мелирование": uiMessage("master.s0198") };
