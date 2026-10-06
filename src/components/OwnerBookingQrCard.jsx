import { UiValue, uiMessage, uiTemplate, uiError, useUiMessages } from "../i18n/uiMessages.js";
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
  const { renderUi } = useUiMessages();
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
          setPayloadError(uiError(uiMessage("salon.s1197")))
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
        setPayloadError(uiError(String(payloadResult?.error || "OWNER_BOOKING_QR_PAYLOAD_FETCH_FAILED")))
        setLoading(false)
        return
      }

      const nextPayload = payloadResult.payload || null
      setPayload(nextPayload)

      if (pngResult?.ok && pngResult.blob) {
        currentObjectUrl = URL.createObjectURL(pngResult.blob)
        setImageUrl(currentObjectUrl)
      } else {
        setImageError(uiError(String(pngResult?.error || "OWNER_BOOKING_QR_PNG_FETCH_FAILED")))
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
  const qrAlt = title ? uiMessage("salon.s1198", {p0: title}) : uiMessage("salon.s1199")

  async function copyBookingLink() {
    if (!bookingUrl) {
      setActionStatus(uiMessage("salon.s1200"))
      return
    }

    if (!window.navigator?.clipboard?.writeText) {
      setActionStatus(uiMessage("salon.s1201"))
      return
    }

    try {
      await window.navigator.clipboard.writeText(bookingUrl)
      setActionStatus(uiMessage("salon.s1202"))
    } catch {
      setActionStatus(uiMessage("salon.s1203"))
    }
  }

  async function openBooking() {
    if (!bookingUrl) {
      setActionStatus(uiMessage("salon.s1200"))
      return
    }

    window.open(bookingUrl, "_blank", "noopener,noreferrer")
  }

  function downloadQr() {
    if (!imageUrl) {
      setActionStatus(uiMessage("salon.s1204"))
      return
    }

    const anchor = document.createElement("a")
    anchor.href = imageUrl
    anchor.download = uiTemplate(["","-","-qr.png"], [safeOwnerType || "owner", safeSlug || "booking"])
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  return (
    <div style={cardStyle()}>
      <div style={sectionTitleStyle()}><UiValue value={title || uiMessage("salon.s1205")} /></div>
      {subtitle ? <p style={sectionSubtitleStyle()}><UiValue value={subtitle} /></p> : null}

      {loading ? (
        <div style={{ marginTop: 14, fontSize: 13, color: "#6b7280" }}><UiValue value={uiMessage("salon.s1206")} /></div>
      ) : payloadError ? (
        <div style={{ marginTop: 14, fontSize: 13, color: "#991b1b", lineHeight: 1.45 }}><UiValue value={uiMessage("salon.s1207")} /><UiValue value={payloadError} />
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={codeBoxStyle()}><UiValue value={bookingUrl || uiMessage("salon.s1200")} /></div>

          {imageUrl ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <img
                src={imageUrl}
                alt={renderUi(qrAlt)}
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
              <UiValue value={imageError ? uiMessage("salon.s1208") : uiMessage("salon.s1206")} />
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" onClick={copyBookingLink} style={actionButtonStyle("primary")}><UiValue value={uiMessage("salon.s1209")} /></button>
            <button type="button" onClick={openBooking} style={actionButtonStyle("secondary")}><UiValue value={uiMessage("salon.s1210")} /></button>
            <button type="button" onClick={downloadQr} style={actionButtonStyle()}><UiValue value={uiMessage("salon.s1211")} /></button>
          </div>

          {actionStatus ? (
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}><UiValue value={actionStatus} /></div>
          ) : null}

          {imageError ? (
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.45 }}>
              <UiValue value={imageError} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
