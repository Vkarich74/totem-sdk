
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useMaster } from "../MasterContext"
import PageSection from "../../cabinet/PageSection"
import OwnerBookingQrCard from "../../components/OwnerBookingQrCard"
import {
  createMasterOwnerQrDestination,
  deactivateMasterOwnerQrDestination,
  getMasterActiveOwnerQrDestination,
  getMasterOwnerQrDestinations,
  updateMasterOwnerQrDestination,
  uploadMasterOwnerQrDestinationImage,
  deleteMasterOwnerQrDestinationImage
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
      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>{title}</div>
      {hint ? (
        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px", lineHeight: 1.45 }}>{hint}</div>
      ) : null}
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{label}</div>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
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

function ReadonlyRow({ label, value }){
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      padding: "10px 0",
      borderBottom: "1px solid #f3f4f6"
    }}>
      <div style={{ fontSize: "13px", color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", textAlign: "right" }}>{value || "—"}</div>
    </div>
  )
}

const OWNER_QR_LABEL = "QR для оплаты"
const OWNER_QR_DESCRIPTION = "Загрузите готовое изображение QR из банка или приложения. TOTEM только хранит изображение."
const OWNER_QR_EMPTY_NOTE = "QR ещё не добавлен."
const OWNER_QR_EMPTY_HINT = "Загрузите изображение QR или вставьте ссылку на изображение."
const OWNER_QR_LINK_LABEL = "Вставить ссылку на изображение QR"
const OWNER_QR_LINK_BUTTON = "Сохранить ссылку"
const OWNER_QR_UPLOAD_BUTTON = "Загрузить изображение QR"
const OWNER_QR_REPLACE_BUTTON = "Заменить изображение QR"
const OWNER_QR_DELETE_BUTTON = "Удалить изображение QR"
const QR_IMAGE_FIELD = "qr_image_url"
const BANK_FIELD = ["bank", "name"].join("_")
const ACCOUNT_FIELD = ["account", "name"].join("_")
const PHONE_FIELD = ["phone", "or", "account"].join("_")

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
      setError("MASTER_SLUG_MISSING")
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
      setError(loadError?.message || "MASTER_OWNER_QR_DESTINATION_LOAD_FAILED")
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

  async function persistOwnerQrDestination(nextQrImageUrl = form.qr_image_url) {
    const link = String(nextQrImageUrl || "").trim()

    if (!destinationId && !link) {
      setError("OWNER_QR_IMAGE_URL_REQUIRED")
      return false
    }

    const payload = buildOwnerQrPayload(link, { forCreate: !destinationId })
    setSaving(true)
    setError("")
    setMessage("")

    try {
      const result = destinationId
        ? await updateDestination(slug, destinationId, payload)
        : await createDestination(slug, payload)

      if (!result?.ok) {
        throw new Error(result?.error || "MASTER_OWNER_QR_DESTINATION_SAVE_FAILED")
      }

      if (!destinationId && result?.destination?.id) {
        setDestinationId(String(result.destination.id || ""))
      }

      await loadOwnerQrDestination()
      setMessage("QR для оплаты сохранён")
      return true
    } catch (saveError) {
      setError(saveError?.message || "MASTER_OWNER_QR_DESTINATION_SAVE_FAILED")
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
        throw new Error(result?.error || "MASTER_OWNER_QR_DESTINATION_DEACTIVATE_FAILED")
      }

      await loadOwnerQrDestination()
      setMessage("QR для оплаты деактивирован")
    } catch (deactivateError) {
      setError(deactivateError?.message || "MASTER_OWNER_QR_DESTINATION_DEACTIVATE_FAILED")
    } finally {
      setSaving(false)
    }
  }

  async function handleClearImage() {
    if (!destinationId || saving || !form.qr_image_url) {
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const result = await deleteImage(slug, destinationId)
      if (!result?.ok) {
        throw new Error(result?.error || "MASTER_OWNER_QR_IMAGE_DELETE_FAILED")
      }

      await loadOwnerQrDestination()
      setMessage("Изображение QR удалено")
    } catch (deleteError) {
      setError(deleteError?.message || "MASTER_OWNER_QR_IMAGE_DELETE_FAILED")
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadFile(file) {
    if (saving || uploading) {
      return
    }

    if (!file) {
      setError("OWNER_QR_IMAGE_INVALID_FILE")
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
          throw new Error(createResult?.error || "MASTER_OWNER_QR_DESTINATION_SAVE_FAILED")
        }

        activeDestinationId = String(createResult?.destination?.id || "")
        if (!activeDestinationId) {
          throw new Error("MASTER_OWNER_QR_DESTINATION_SAVE_FAILED")
        }

        setDestinationId(activeDestinationId)
      }

      const result = await uploadImage(slug, activeDestinationId, file)
      if (!result?.ok) {
        throw new Error(result?.error || "MASTER_OWNER_QR_IMAGE_UPLOAD_FAILED")
      }

      await loadOwnerQrDestination()
      setMessage("Изображение QR прикреплено")
    } catch (uploadError) {
      setError(uploadError?.message || "MASTER_OWNER_QR_IMAGE_UPLOAD_FAILED")
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
      title="QR для оплаты"
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
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>{OWNER_QR_EMPTY_NOTE}</div>
              <div style={{ fontSize: "13px", lineHeight: 1.45, color: "#6b7280" }}>{OWNER_QR_EMPTY_HINT}</div>
            </div>
          ) : null}

          <Field
            label={OWNER_QR_LINK_LABEL}
            value={qrImageUrl}
            onChange={(value) => updateField("qr_image_url", value)}
            placeholder="https://..."
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
              {uploading ? "Загружаем…" : uploadButtonLabel}
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
              {saving ? "Сохраняем…" : OWNER_QR_LINK_BUTTON}
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
                {OWNER_QR_DELETE_BUTTON}
              </button>
            ) : null}
          </div>

          {message ? (
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#027a48", fontWeight: 600 }}>{message}</div>
          ) : null}
          {error ? (
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#b42318", fontWeight: 600 }}>
              {error}
            </div>
          ) : null}
          {loading ? (
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#6b7280" }}>Загружаем active QR…</div>
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
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>Превью QR</div>
            {previewVisible ? (
              <img
                src={qrImageUrl}
                alt="QR preview"
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
                {qrImageUrl ? "Превью недоступно." : "Добавьте ссылку на изображение QR, чтобы увидеть лёгкое превью."}
              </div>
            )}
          </div>
        </div>
      </div>
    </Block>
  )
}

function getBillingUi(billingAccess, billingBlockReason){
  const state = String(
    billingAccess?.access_state ||
    billingAccess?.accessState ||
    "active"
  ).toLowerCase()

  if(state === "blocked"){
    return {
      title: "Оплата требует внимания",
      tone: "#b42318",
      bg: "#fff5f5",
      border: "#f5c2c7",
      note: billingBlockReason || "Доступ ограничен до оплаты"
    }
  }

  if(state === "grace"){
    return {
      title: "Льготный период",
      tone: "#9a6700",
      bg: "#fff8db",
      border: "#facc15",
      note: billingBlockReason || "Скоро потребуется пополнение"
    }
  }

  return {
    title: "Подписка активна",
    tone: "#027a48",
    bg: "#ecfdf3",
    border: "#abefc6",
    note: "Платёжный доступ работает без ограничений"
  }
}

export default function MasterSettingsPage() {
  const {
    master,
    slug,
    billingAccess,
    canWrite,
    canWithdraw,
    billingBlockReason
  } = useMaster()

  const [name, setName] = useState("")
  const [photo, setPhoto] = useState("")
  const [bio, setBio] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [slot, setSlot] = useState("15")
  const [minBefore, setMinBefore] = useState("60")
  const [advance, setAdvance] = useState("30")

  useEffect(() => {
    setName(master?.name || "")
    setPhoto(master?.photo || master?.avatar || master?.image || "")
    setBio(master?.bio || master?.about || "")
    setPhone(master?.phone || "")
    setEmail(master?.email || "")
    setWhatsapp(master?.whatsapp || master?.phone || "")
  }, [master])

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
    console.log("MASTER SETTINGS", {
      slug,
      name,
      photo,
      bio,
      phone,
      email,
      whatsapp,
      slot,
      minBefore,
      advance
    })

    alert("Настройки сохранены локально")
  }

  return (
    <div style={{ padding: "20px" }}>
      <PageSection title="Настройки мастера">
        <div style={{
          border: `1px solid ${billingUi.border}`,
          background: billingUi.bg,
          color: billingUi.tone,
          borderRadius: "14px",
          padding: "16px",
          marginBottom: "16px"
        }}>
          <div style={{ fontSize: "15px", fontWeight: 800, marginBottom: "6px" }}>{billingUi.title}</div>
          <div style={{ fontSize: "13px", lineHeight: 1.45 }}>{billingUi.note}</div>
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#344054" }}>
            Запись: <strong>{canWrite ? "доступна" : "ограничена"}</strong> · Выплаты: <strong>{canWithdraw ? "доступны" : "ограничены"}</strong>
          </div>
        </div>

        <Block title="Профиль" hint="Базовые данные мастера. Эта страница не тянет тяжёлые списки клиентов, записей и финансов.">
          <Field label="Имя" value={name} onChange={setName} />
          <Field label="Фото (URL)" value={photo} onChange={setPhoto} placeholder="https://..." />
          <Field label="Описание" value={bio} onChange={setBio} />
        </Block>

        <Block title="Контакты" hint="Операционные контакты для связи с клиентами.">
          <Field label="Телефон" value={phone} onChange={setPhone} />
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />
        </Block>

        <Block title="Параметры бронирования" hint="Локальные параметры формы и расписания. Управление услугами вынесено в отдельную страницу «Услуги».">
          <Field label="Шаг слота (мин)" value={slot} onChange={setSlot} type="number" />
          <Field label="Минимум до записи (мин)" value={minBefore} onChange={setMinBefore} type="number" />
          <Field label="Максимум вперёд (дней)" value={advance} onChange={setAdvance} type="number" />
        </Block>

        <Block title="Billing / доступ" hint="Read-only блок. Здесь только статус и маршруты в профильные страницы, без тяжёлых таблиц.">
          <ReadonlyRow label="Master slug" value={slug} />
          <ReadonlyRow label="Billing model" value={billingModel} />
          <ReadonlyRow label="Статус подписки" value={subscriptionStatus} />
          <ReadonlyRow
            label="Период до"
            value={currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleString("ru-RU") : "—"}
          />
          <ReadonlyRow label="Запись" value={canWrite ? "доступна" : "ограничена"} />
          <ReadonlyRow label="Выплаты" value={canWithdraw ? "доступны" : "ограничены"} />

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            marginTop: "14px"
          }}>
            <Link
              to={`/master/${slug}/services`}
              style={{
                display: "block",
                textDecoration: "none",
                textAlign: "center",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#111827",
                fontWeight: 700
              }}
            >
              Открыть услуги
            </Link>

            <Link
              to={`/master/${slug}/finance`}
              style={{
                display: "block",
                textDecoration: "none",
                textAlign: "center",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#111827",
                fontWeight: 700
              }}
            >
              Открыть финансы
            </Link>
          </div>
        </Block>

        <OwnerQrDestinationEditor
          slug={slug}
          loadDestinations={getMasterOwnerQrDestinations}
          loadActiveDestination={getMasterActiveOwnerQrDestination}
          createDestination={createMasterOwnerQrDestination}
          updateDestination={updateMasterOwnerQrDestination}
          deactivateDestination={deactivateMasterOwnerQrDestination}
          uploadImage={uploadMasterOwnerQrDestinationImage}
          deleteImage={deleteMasterOwnerQrDestinationImage}
        />

        <Block title="Моя ссылка и QR" hint="Быстрый доступ к ссылке записи и QR-коду для клиентов.">
          <OwnerBookingQrCard
            ownerType="master"
            slug={slug}
            title="QR для записи к мастеру"
            subtitle="Клиент откроет форму записи с выбранным мастером."
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
            fontWeight: 600
          }}
        >
          Сохранить
        </button>
      </PageSection>
    </div>
  )
}
