import { UiValue, uiMessage, uiDate, uiJoin, uiTemplate, uiError, useUiMessages } from "../../i18n/uiMessages.js";
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"
import PageSection from "../../cabinet/PageSection"
import OwnerBookingQrCard from "../../components/OwnerBookingQrCard"
import {
  createSalonOwnerQrDestination,
  deactivateSalonOwnerQrDestination,
  getSalonActiveOwnerQrDestination,
  getSalonOwnerQrDestinations,
  updateSalonOwnerQrDestination,
  uploadSalonOwnerQrDestinationImage,
  deleteSalonOwnerQrDestinationImage
} from "../../api/internal"

function Block({ title, hint, children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "16px",
        background: "#ffffff"
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}><UiValue value={title} /></div>
      {hint ? (
        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px", lineHeight: 1.45 }}><UiValue value={hint} /></div>
      ) : null}
      <UiValue value={children} />
    </div>
  )
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  const { renderUi } = useUiMessages();
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}><UiValue value={label} /></div>
      <input
        type={type}
        value={value || ""}
        placeholder={renderUi(placeholder)}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          outline: "none"
        }}
      />
    </div>
  )
}

function ReadonlyRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 0",
        borderBottom: "1px solid #f3f4f6"
      }}
    >
      <div style={{ fontSize: "13px", color: "#6b7280" }}><UiValue value={label} /></div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", textAlign: "right" }}><UiValue value={value || "—"} /></div>
    </div>
  )
}

const OWNER_QR_LABEL = uiMessage("salon.s0781")
const OWNER_QR_DESCRIPTION = uiMessage("salon.s0782")
const OWNER_QR_EMPTY_NOTE = uiMessage("salon.s0783")
const OWNER_QR_EMPTY_HINT = uiMessage("salon.s0784")
const OWNER_QR_LINK_LABEL = uiMessage("salon.s0785")
const OWNER_QR_LINK_BUTTON = uiMessage("salon.s0786")
const OWNER_QR_UPLOAD_BUTTON = uiMessage("salon.s0787")
const OWNER_QR_REPLACE_BUTTON = uiMessage("salon.s0788")
const OWNER_QR_DELETE_BUTTON = uiMessage("salon.s0789")
const QR_IMAGE_FIELD = "qr_image_url"
const BANK_FIELD = uiJoin(["bank", "name"], "_")
const ACCOUNT_FIELD = uiJoin(["account", "name"], "_")
const PHONE_FIELD = uiJoin(["phone", "or", "account"], "_")

const OWNER_QR_EMPTY_FORM = {
  qr_image_url: ""
}

function normalizeOwnerQrForm(destination) {
  return {
    qr_image_url: String(destination?.qr_image_url || "")
  }
}

function buildOwnerQrPayload(qrImageUrl, { forCreate = false, allowFallback = false } = {}) {
  const payload = {}
  const link = String(qrImageUrl || "").trim()

  if (forCreate) {
    payload.label = OWNER_QR_LABEL
    payload[BANK_FIELD] = ""
    payload[ACCOUNT_FIELD] = ""
  }

  if (link) {
    payload[QR_IMAGE_FIELD] = link
  }

  if (forCreate && allowFallback && !link) {
    payload[PHONE_FIELD] = "qr-image"
  }

  return payload
}

function OwnerQrDestinationEditor({
  slug,
  loadDestinations,
  loadActiveDestination,
  createDestination,
  updateDestination,
  deactivateDestination,
  uploadImage,
  deleteImage
}) {
  const { renderUi } = useUiMessages();
  const [form, setForm] = useState(OWNER_QR_EMPTY_FORM)
  const [destinationId, setDestinationId] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [previewBroken, setPreviewBroken] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setPreviewBroken(false)
  }, [form.qr_image_url])

  async function loadOwnerQrDestination() {
    if (!slug) {
      setForm(OWNER_QR_EMPTY_FORM)
      setDestinationId("")
      setIsActive(false)
      setError(uiError("SALON_SLUG_MISSING"))
      return
    }

    setLoading(true)
    setError("")
    setMessage("")

    try {
      const [activeResult, listResult] = await Promise.all([
        loadActiveDestination(slug),
        loadDestinations(slug)
      ])

      const activeDestination =
        activeResult?.destination ||
        listResult?.destinations?.find((item) => item?.is_active) ||
        null

      if (activeDestination) {
        setDestinationId(String(activeDestination.id || ""))
        setIsActive(Boolean(activeDestination.is_active))
        setForm(normalizeOwnerQrForm(activeDestination))
        setPreviewBroken(false)
      } else {
        setDestinationId("")
        setIsActive(false)
        setForm(OWNER_QR_EMPTY_FORM)
        setPreviewBroken(false)
      }
    } catch (loadError) {
      setForm(OWNER_QR_EMPTY_FORM)
      setDestinationId("")
      setIsActive(false)
      setError(uiError(loadError?.message || "SALON_OWNER_QR_DESTINATION_LOAD_FAILED"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOwnerQrDestination()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setMessage("")
    setError("")
    if (field === "qr_image_url") {
      setPreviewBroken(false)
    }
  }

  async function persistOwnerQrDestination(nextForm = null) {
    const nextQrImageUrl = String((nextForm || form)?.qr_image_url || "").trim()
    if (!destinationId && !nextQrImageUrl) {
      setError(uiError(uiMessage("salon.s0790")))
      return false
    }

    const payload = buildOwnerQrPayload(nextQrImageUrl, { forCreate: !destinationId })
    setSaving(true)
    setError("")
    setMessage("")

    try {
      const result = destinationId
        ? await updateDestination(slug, destinationId, payload)
        : await createDestination(slug, payload)

      if (!result?.ok) {
        throw new Error(result?.error || "SALON_OWNER_QR_DESTINATION_SAVE_FAILED")
      }

      if (!destinationId && result?.destination?.id) {
        setDestinationId(String(result.destination.id || ""))
      }

      await loadOwnerQrDestination()
      setMessage(uiMessage("salon.s0791"))
      return true
    } catch (saveError) {
      setError(uiError(saveError?.message || "SALON_OWNER_QR_DESTINATION_SAVE_FAILED"))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!destinationId || saving) {
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const result = await deactivateDestination(slug, destinationId)
      if (!result?.ok) {
        throw new Error(result?.error || "SALON_OWNER_QR_DESTINATION_DEACTIVATE_FAILED")
      }

      await loadOwnerQrDestination()
      setMessage(uiMessage("salon.s0792"))
    } catch (deactivateError) {
      setError(uiError(deactivateError?.message || "SALON_OWNER_QR_DESTINATION_DEACTIVATE_FAILED"))
    } finally {
      setSaving(false)
    }
  }

  async function handleClearImage() {
    if (!destinationId || saving || uploading || !form.qr_image_url) {
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const result = await deleteImage(slug, destinationId)
      if (!result?.ok) {
        throw new Error(result?.error || "SALON_OWNER_QR_IMAGE_DELETE_FAILED")
      }

      await loadOwnerQrDestination()
      setMessage(uiMessage("salon.s0793"))
    } catch (deleteError) {
      setError(uiError(deleteError?.message || "SALON_OWNER_QR_IMAGE_DELETE_FAILED"))
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadFile(file) {
    if (saving || uploading) {
      return
    }

    if (!file) {
      setError(uiError(uiMessage("salon.s0794")))
      return
    }

    setUploading(true)
    setError("")
    setMessage("")

    try {
      let activeDestinationId = destinationId

      if (!activeDestinationId) {
        const createResult = await createDestination(
          slug,
          buildOwnerQrPayload("", { forCreate: true, allowFallback: true })
        )

        if (!createResult?.ok) {
          throw new Error(createResult?.error || "SALON_OWNER_QR_DESTINATION_SAVE_FAILED")
        }

        activeDestinationId = String(createResult?.destination?.id || "")
        if (!activeDestinationId) {
          throw new Error("SALON_OWNER_QR_DESTINATION_SAVE_FAILED")
        }

        setDestinationId(activeDestinationId)
      }

      const result = await uploadImage(slug, activeDestinationId, file)
      if (!result?.ok) {
        throw new Error(result?.error || "SALON_OWNER_QR_IMAGE_UPLOAD_FAILED")
      }

      await loadOwnerQrDestination()
      setMessage(uiMessage("salon.s0795"))
    } catch (uploadError) {
      setError(uiError(uploadError?.message || "SALON_OWNER_QR_IMAGE_UPLOAD_FAILED"))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  async function handleFileInputChange(event) {
    const file = event.target.files?.[0] || null
    await handleUploadFile(file)
  }

  function triggerUploadPicker() {
    if (saving || uploading || loading) {
      return
    }

    fileInputRef.current?.click()
  }

  const qrImageUrl = String(form.qr_image_url || "").trim()
  const previewVisible = Boolean(qrImageUrl && !previewBroken)
  const hasImage = Boolean(qrImageUrl)
  const uploadDisabled = saving || uploading || loading
  const saveButtonDisabled = saving || uploading || loading || !qrImageUrl
  const uploadButtonLabel = hasImage ? OWNER_QR_REPLACE_BUTTON : OWNER_QR_UPLOAD_BUTTON

  return (
    <Block
      title={uiMessage("salon.s0781")}
      hint={OWNER_QR_DESCRIPTION}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(180px, 0.9fr)",
          gap: "16px",
          alignItems: "start"
        }}
      >
        <div>
          {!destinationId ? (
            <div
              style={{
                padding: "14px",
                borderRadius: "12px",
                border: "1px dashed #d1d5db",
                background: "#fafafa",
                marginBottom: "14px"
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}><UiValue value={OWNER_QR_EMPTY_NOTE} /></div>
              <div style={{ fontSize: "13px", lineHeight: 1.45, color: "#6b7280" }}><UiValue value={OWNER_QR_EMPTY_HINT} /></div>
            </div>
          ) : null}

          <Field
            label={OWNER_QR_LINK_LABEL}
            value={qrImageUrl}
            onChange={(value) => updateField("qr_image_url", value)}
            placeholder={uiMessage("salon.s0796")}
          />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" }}>
            <button
              type="button"
              onClick={triggerUploadPicker}
              disabled={uploadDisabled}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#111827",
                cursor: uploadDisabled ? "not-allowed" : "pointer",
                fontWeight: 700
              }}
            >
              <UiValue value={uploading ? uiMessage("salon.s0797") : uploadButtonLabel} />
            </button>

            <button
              type="button"
              onClick={() => persistOwnerQrDestination(qrImageUrl)}
              disabled={saveButtonDisabled}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: saveButtonDisabled ? "not-allowed" : "pointer",
                fontWeight: 700
              }}
            >
              <UiValue value={saving ? uiMessage("salon.s0519") : OWNER_QR_LINK_BUTTON} />
            </button>

            {hasImage ? (
              <button
                type="button"
                onClick={handleClearImage}
                disabled={saving || uploading}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#111827",
                  cursor: saving || uploading ? "not-allowed" : "pointer",
                  fontWeight: 700
                }}
              >
                <UiValue value={OWNER_QR_DELETE_BUTTON} />
              </button>
            ) : null}
          </div>

          {message ? (
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#027a48", fontWeight: 600 }}><UiValue value={message} /></div>
          ) : null}
          {error ? (
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#b42318", fontWeight: 600 }}>
              <UiValue value={error} />
            </div>
          ) : null}
          {loading ? (
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#6b7280" }}><UiValue value={uiMessage("salon.s0798")} /></div>
          ) : null}
        </div>

        <div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "12px",
              background: "#fafafa",
              minHeight: "220px"
            }}
          >
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}><UiValue value={uiMessage("salon.s0799")} /></div>
            {previewVisible ? (
              <img
                src={qrImageUrl}
                alt={renderUi(uiMessage("salon.s0800"))}
                loading="lazy"
                decoding="async"
                onError={() => setPreviewBroken(true)}
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: "180px",
                  maxHeight: "180px",
                  objectFit: "contain",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  background: "#fff"
                }}
              />
            ) : (
              <div style={{ fontSize: "13px", lineHeight: 1.45, color: "#6b7280" }}>
                <UiValue value={qrImageUrl ? uiMessage("salon.s0801") : uiMessage("salon.s0802")} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Block>
  )
}

function QuickLink({ to, title, note }) {
  return (
    <Link
      to={to}
      style={{
        display: "block",
        textDecoration: "none",
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: "10px",
        border: "1px solid #e5e7eb",
        background: "#fff",
        color: "#111827"
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}><UiValue value={title} /></div>
      <div style={{ fontSize: "12px", lineHeight: 1.45, color: "#6b7280" }}><UiValue value={note} /></div>
    </Link>
  )
}

function getBillingUi(billingAccess, billingBlockReason) {
  const state = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    "active"
  ).toLowerCase()

  if (state === "blocked") {
    return {
      title: uiMessage("salon.s0803"),
      tone: "#b42318",
      bg: "#fff5f5",
      border: "#f5c2c7",
      note: uiError(billingBlockReason, uiMessage("salon.s0804"))
    }
  }

  if (state === "grace") {
    return {
      title: uiMessage("salon.s0302"),
      tone: "#9a6700",
      bg: "#fff8db",
      border: "#facc15",
      note: uiError(billingBlockReason, uiMessage("salon.s0303"))
    }
  }

  return {
    title: uiMessage("salon.s0805"),
    tone: "#027a48",
    bg: "#ecfdf3",
    border: "#abefc6",
    note: uiMessage("salon.s0806")
  }
}

export default function SettingsPage() {
  const { slug: routeSlug } = useParams()
  const slug = resolveSalonSlug(routeSlug)
  const {
    identity,
    billingAccess,
    canWrite,
    canWithdraw,
    billingBlockReason,
    loading,
    error
  } = useSalonContext()

  const [name, setName] = useState("")
  const [photo, setPhoto] = useState("")
  const [description, setDescription] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [city, setCity] = useState("")
  const [slot, setSlot] = useState("15")
  const [minBefore, setMinBefore] = useState("60")
  const [advance, setAdvance] = useState("30")

  useEffect(() => {
    setName(identity?.name || identity?.title || "")
    setPhoto(identity?.photo || identity?.image || identity?.cover || "")
    setDescription(identity?.description || identity?.about || identity?.bio || "")
    setPhone(identity?.phone || "")
    setEmail(identity?.email || "")
    setWhatsapp(identity?.whatsapp || identity?.phone || "")
    setCity(identity?.city || "")
  }, [identity])

  const billingUi = useMemo(
    () => getBillingUi(billingAccess, billingBlockReason),
    [billingAccess, billingBlockReason]
  )

  const billingModel =
    billingAccess?.billing_model ||
    billingAccess?.billingModel ||
    "—"

  const subscriptionStatus =
    billingAccess?.subscription_status ||
    billingAccess?.subscriptionStatus ||
    "—"

  const currentPeriodEnd =
    billingAccess?.current_period_end ||
    billingAccess?.currentPeriodEnd ||
    null

  function save() {
    console.log("SALON SETTINGS", {
      slug,
      name,
      photo,
      description,
      phone,
      email,
      whatsapp,
      city,
      slot,
      minBefore,
      advance
    })

    alert(renderUi(uiError(uiMessage("salon.s0807"))))
  }

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSection title={uiMessage("salon.s0808")}>
          <div style={{ color: "#6b7280" }}><UiValue value={uiMessage("salon.s0809")} /></div>
        </PageSection>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSection title={uiMessage("salon.s0808")}>
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fff5f5",
              color: "#b42318",
              borderRadius: "12px",
              padding: "14px"
            }}
          ><UiValue value={uiMessage("salon.s0810")} /><UiValue value={error} />
          </div>
        </PageSection>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px" }}>
      <PageSection title={uiMessage("salon.s0808")}>
        <div
          style={{
            border: uiTemplate(["1px solid ",""], [billingUi.border]),
            background: billingUi.bg,
            color: billingUi.tone,
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "16px"
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 800, marginBottom: "6px" }}><UiValue value={billingUi.title} /></div>
          <div style={{ fontSize: "13px", lineHeight: 1.45 }}><UiValue value={billingUi.note} /></div>
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#344054" }}><UiValue value={uiMessage("salon.s0005")} /><strong><UiValue value={canWrite ? uiMessage("salon.s0006") : uiMessage("salon.s0007")} /></strong><UiValue value={uiMessage("salon.s0008")} /><strong><UiValue value={canWithdraw ? uiMessage("salon.s0009") : uiMessage("salon.s0010")} /></strong>
          </div>
        </div>

        <Block title={uiMessage("salon.s0811")} hint={uiMessage("salon.s0812")}>
          <Field label={uiMessage("salon.s0559")} value={name} onChange={setName} />
          <Field label={uiMessage("salon.s0813")} value={photo} onChange={setPhoto} placeholder={uiMessage("salon.s0796")} />
          <Field label={uiMessage("salon.s0597")} value={description} onChange={setDescription} />
          <Field label={uiMessage("salon.s0571")} value={city} onChange={setCity} />
        </Block>

        <Block title={uiMessage("salon.s0457")} hint={uiMessage("salon.s0814")}>
          <Field label={uiMessage("salon.s0230")} value={phone} onChange={setPhone} />
          <Field label={uiMessage("salon.s0815")} value={email} onChange={setEmail} />
          <Field label={uiMessage("salon.s0574")} value={whatsapp} onChange={setWhatsapp} />
        </Block>

        <Block title={uiMessage("salon.s0816")} hint={uiMessage("salon.s0817")}>
          <Field label={uiMessage("salon.s0818")} value={slot} onChange={setSlot} type="number" />
          <Field label={uiMessage("salon.s0819")} value={minBefore} onChange={setMinBefore} type="number" />
          <Field label={uiMessage("salon.s0820")} value={advance} onChange={setAdvance} type="number" />
        </Block>

        <Block title={uiMessage("salon.s0821")} hint={uiMessage("salon.s0822")}>
          <ReadonlyRow label={uiMessage("salon.s0823")} value={slug} />
          <ReadonlyRow label={uiMessage("salon.s0824")} value={billingModel} />
          <ReadonlyRow label={uiMessage("salon.s0825")} value={subscriptionStatus} />
          <ReadonlyRow
            label={uiMessage("salon.s0826")}
            value={currentPeriodEnd ? uiDate(currentPeriodEnd, {dateStyle: "short", timeStyle: "short"}) : "—"}
          />
          <ReadonlyRow label={uiMessage("salon.s0827")} value={canWrite ? uiMessage("salon.s0006") : uiMessage("salon.s0007")} />
          <ReadonlyRow label={uiMessage("salon.s0030")} value={canWithdraw ? uiMessage("salon.s0009") : uiMessage("salon.s0010")} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
              marginTop: "14px"
            }}
          >
            <QuickLink
              to={buildSalonPath(slug, "services")}
              title={uiMessage("salon.s0828")}
              note={uiMessage("salon.s0829")}
            />
            <QuickLink
              to={buildSalonPath(slug, "masters")}
              title={uiMessage("salon.s0830")}
              note={uiMessage("salon.s0831")}
            />
            <QuickLink
              to={buildSalonPath(slug, "finance")}
              title={uiMessage("salon.s0832")}
              note={uiMessage("salon.s0833")}
            />
            <QuickLink
              to={buildSalonPath(slug, "contracts")}
              title={uiMessage("salon.s0834")}
              note={uiMessage("salon.s0835")}
            />
          </div>
        </Block>

        <OwnerQrDestinationEditor
          slug={slug}
          loadDestinations={getSalonOwnerQrDestinations}
          loadActiveDestination={getSalonActiveOwnerQrDestination}
          createDestination={createSalonOwnerQrDestination}
          updateDestination={updateSalonOwnerQrDestination}
          deactivateDestination={deactivateSalonOwnerQrDestination}
          uploadImage={uploadSalonOwnerQrDestinationImage}
          deleteImage={deleteSalonOwnerQrDestinationImage}
        />

        <Block title={uiMessage("salon.s0836")} hint={uiMessage("salon.s0837")}>
          <OwnerBookingQrCard
            ownerType="salon"
            slug={slug}
            title={uiMessage("salon.s0365")}
            subtitle={uiMessage("salon.s0366")}
          />
        </Block>

        <button
          onClick={save}
          style={{
            padding: "12px 18px",
            borderRadius: "10px",
            border: "none",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            width: "100%",
            maxWidth: "220px"
          }}
        ><UiValue value={uiMessage("salon.s0838")} /></button>
      </PageSection>
    </div>
  )
}
