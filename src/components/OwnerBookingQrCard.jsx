import { useEffect, useMemo, useState } from "react"
import { getOwnerBookingQrPayload, getOwnerBookingQrPngBlob } from "../api/internal"

function normalizeOwnerType(ownerType) {
  const value = String(ownerType || "").trim().toLowerCase()
  if (value === "salon" || value === "master") {
    return value
  }
  return ""
}

function cardStyle() {
  return {
    border: "1px solid #dbeafe",
    borderRadius: "16px",
    background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
    padding: "16px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
  }
}

function sectionTitleStyle() {
  return {
    margin: "0 0 6px",
    fontSize: "18px",
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.2
  }
}

function sectionSubtitleStyle() {
  return {
    margin: 0,
    fontSize: "13px",
    color: "#6b7280",
    lineHeight: 1.45
  }
}

function codeBoxStyle() {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#fff",
    padding: "12px",
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#111827",
    wordBreak: "break-word"
  }
}

function actionButtonStyle(kind = "default") {
  const base = {
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer"
  }

  if (kind === "primary") {
    return {
      ...base,
      border: "none",
      background: "#111827",
      color: "#fff"
    }
  }

  if (kind === "secondary") {
    return {
      ...base,
      border: "1px solid #d1d5db",
      background: "#fff",
      color: "#111827"
    }
  }

  return {
    ...base,
    border: "1px solid #cbd5e1",
    background: "#eff6ff",
    color: "#1d4ed8"
  }
}

export default function OwnerBookingQrCard({ ownerType, slug, title, subtitle }) {
  const safeOwnerType = useMemo(() => normalizeOwnerType(ownerType), [ownerType])
  const safeSlug = useMemo(() => String(slug || "").trim(), [slug])
  const [loading, setLoading] = useState(true)
  const [payloadError, setPayloadError] = useState("")
  const [imageError, setImageError] = useState("")
  const [payload, setPayload] = useState(null)
  const [imageUrl, setImageUrl] = useState("")
  const [actionStatus, setActionStatus] = useState("")

  useEffect(() => {
    if (!actionStatus) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setActionStatus("")
    }, 2000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [actionStatus])

  useEffect(() => {
    let active = true
    let currentObjectUrl = ""

    async function run() {
      setLoading(true)
      setPayloadError("")
      setImageError("")
      setPayload(null)
      setImageUrl("")

      if (!safeOwnerType || !safeSlug) {
        if (active) {
          setPayloadError("Ссылка недоступна.")
          setLoading(false)
        }
        return
      }

      const [payloadResult, pngResult] = await Promise.all([
        getOwnerBookingQrPayload(safeOwnerType, safeSlug),
        getOwnerBookingQrPngBlob(safeOwnerType, safeSlug)
      ])

      if (!active) {
        if (currentObjectUrl) {
          URL.revokeObjectURL(currentObjectUrl)
        }
        return
      }

      if (!payloadResult?.ok) {
        setPayloadError(String(payloadResult?.error || "OWNER_BOOKING_QR_PAYLOAD_FETCH_FAILED"))
        setLoading(false)
        return
      }

      const nextPayload = payloadResult.payload || null
      setPayload(nextPayload)

      if (pngResult?.ok && pngResult.blob) {
        currentObjectUrl = URL.createObjectURL(pngResult.blob)
        setImageUrl(currentObjectUrl)
      } else {
        setImageError(String(pngResult?.error || "OWNER_BOOKING_QR_PNG_FETCH_FAILED"))
      }

      setLoading(false)
    }

    run()

    return () => {
      active = false

      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }
    }
  }, [safeOwnerType, safeSlug])

  const bookingUrl = String(payload?.booking_url || payload?.qr_target_url || "").trim()
  const qrAlt = title ? `${title} QR-код` : "QR-код для записи"

  async function copyBookingLink() {
    if (!bookingUrl) {
      setActionStatus("Ссылка недоступна")
      return
    }

    if (!window.navigator?.clipboard?.writeText) {
      setActionStatus("Буфер обмена недоступен")
      return
    }

    try {
      await window.navigator.clipboard.writeText(bookingUrl)
      setActionStatus("Ссылка скопирована")
    } catch {
      setActionStatus("Не удалось скопировать ссылку")
    }
  }

  async function openBooking() {
    if (!bookingUrl) {
      setActionStatus("Ссылка недоступна")
      return
    }

    window.open(bookingUrl, "_blank", "noopener,noreferrer")
  }

  function downloadQr() {
    if (!imageUrl) {
      setActionStatus("QR-код недоступен")
      return
    }

    const anchor = document.createElement("a")
    anchor.href = imageUrl
    anchor.download = `${safeOwnerType || "owner"}-${safeSlug || "booking"}-qr.png`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  return (
    <div style={cardStyle()}>
      <div style={sectionTitleStyle()}>{title || "QR для записи"}</div>
      {subtitle ? <p style={sectionSubtitleStyle()}>{subtitle}</p> : null}

      {loading ? (
        <div style={{ marginTop: 14, fontSize: 13, color: "#6b7280" }}>Загрузка QR-кода…</div>
      ) : payloadError ? (
        <div style={{ marginTop: 14, fontSize: 13, color: "#991b1b", lineHeight: 1.45 }}>
          Не удалось загрузить QR-код. {payloadError}
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={codeBoxStyle()}>{bookingUrl || "Ссылка недоступна"}</div>

          {imageUrl ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <img
                src={imageUrl}
                alt={qrAlt}
                style={{
                  width: 220,
                  maxWidth: "100%",
                  borderRadius: "14px",
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  padding: 8,
                  boxSizing: "border-box"
                }}
              />
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
              {imageError ? "QR-код временно недоступен." : "Загрузка QR-кода…"}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" onClick={copyBookingLink} style={actionButtonStyle("primary")}>
              Скопировать ссылку
            </button>
            <button type="button" onClick={openBooking} style={actionButtonStyle("secondary")}>
              Открыть запись
            </button>
            <button type="button" onClick={downloadQr} style={actionButtonStyle()}>
              Скачать QR
            </button>
          </div>

          {actionStatus ? (
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>{actionStatus}</div>
          ) : null}

          {imageError ? (
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
              {imageError}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
