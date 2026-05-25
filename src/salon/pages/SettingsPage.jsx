import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { buildSalonPath, resolveSalonSlug, useSalonContext } from "../SalonContext"
import PageSection from "../../cabinet/PageSection"
import OwnerBookingQrCard from "../../components/OwnerBookingQrCard"
import {
  createSalonOwnerQrDestination,
  deactivateSalonOwnerQrDestination,
  getSalonActiveOwnerQrDestination,
  getSalonOwnerQrDestinations,
  updateSalonOwnerQrDestination
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
      <div style={{ fontSize: "13px", color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", textAlign: "right" }}>{value || "—"}</div>
    </div>
  )
}

const OWNER_QR_EMPTY_FORM = {
  label: "",
  bank_name: "",
  account_name: "",
  phone_or_account: "",
  qr_image_url: ""
}

function normalizeOwnerQrForm(destination) {
  return {
    label: String(destination?.label || ""),
    bank_name: String(destination?.bank_name || ""),
    account_name: String(destination?.account_name || ""),
    phone_or_account: String(destination?.phone_or_account || ""),
    qr_image_url: String(destination?.qr_image_url || "")
  }
}

function buildOwnerQrPayload(form) {
  return {
    label: String(form?.label || "").trim(),
    bank_name: String(form?.bank_name || "").trim(),
    account_name: String(form?.account_name || "").trim(),
    phone_or_account: String(form?.phone_or_account || "").trim(),
    qr_image_url: String(form?.qr_image_url || "").trim()
  }
}

function OwnerQrDestinationEditor({
  slug,
  loadDestinations,
  loadActiveDestination,
  createDestination,
  updateDestination,
  deactivateDestination
}) {
  const [form, setForm] = useState(OWNER_QR_EMPTY_FORM)
  const [destinationId, setDestinationId] = useState("")
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [previewBroken, setPreviewBroken] = useState(false)

  useEffect(() => {
    setPreviewBroken(false)
  }, [form.qr_image_url])

  async function loadOwnerQrDestination() {
    if (!slug) {
      setForm(OWNER_QR_EMPTY_FORM)
      setDestinationId("")
      setIsActive(false)
      setError("SALON_SLUG_MISSING")
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
      setError(loadError?.message || "SALON_OWNER_QR_DESTINATION_LOAD_FAILED")
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
    const payload = buildOwnerQrPayload(nextForm || form)
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

      await loadOwnerQrDestination()
      setMessage("Собственный QR сохранён")
      return true
    } catch (saveError) {
      setError(saveError?.message || "SALON_OWNER_QR_DESTINATION_SAVE_FAILED")
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
      setMessage("Собственный QR деактивирован")
    } catch (deactivateError) {
      setError(deactivateError?.message || "SALON_OWNER_QR_DESTINATION_DEACTIVATE_FAILED")
    } finally {
      setSaving(false)
    }
  }

  async function handleClearImage() {
    if (!destinationId || saving || !form.qr_image_url) {
      return
    }

    const saved = await persistOwnerQrDestination({
      ...form,
      qr_image_url: ""
    })

    if (saved) {
      setMessage("Изображение QR удалено")
    }
  }

  const previewVisible = Boolean(form.qr_image_url && !previewBroken)

  return (
    <Block
      title="Собственный QR"
      hint="Настройка активного QR-дestination для салона. Здесь хранится только ссылка на изображение и реквизиты, без upload или base64."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(180px, 0.9fr)",
          gap: "16px",
          alignItems: "start"
        }}
      >
        <div>
          <ReadonlyRow label="Состояние" value={isActive ? "active" : "inactive"} />
          <ReadonlyRow label="Destination ID" value={destinationId || "—"} />
          <Field label="label" value={form.label} onChange={(value) => updateField("label", value)} />
          <Field label="bank_name" value={form.bank_name} onChange={(value) => updateField("bank_name", value)} />
          <Field label="account_name" value={form.account_name} onChange={(value) => updateField("account_name", value)} />
          <Field
            label="phone_or_account"
            value={form.phone_or_account}
            onChange={(value) => updateField("phone_or_account", value)}
          />
          <Field
            label="qr_image_url"
            value={form.qr_image_url}
            onChange={(value) => updateField("qr_image_url", value)}
            placeholder="https://..."
          />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" }}>
            <button
              type="button"
              onClick={() => persistOwnerQrDestination()}
              disabled={saving}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: saving ? "wait" : "pointer",
                fontWeight: 700
              }}
            >
              {saving ? "Сохраняем…" : destinationId ? "Сохранить QR" : "Создать QR"}
            </button>

            <button
              type="button"
              onClick={handleClearImage}
              disabled={saving || !form.qr_image_url}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#111827",
                cursor: saving || !form.qr_image_url ? "not-allowed" : "pointer",
                fontWeight: 700
              }}
            >
              Удалить изображение QR
            </button>

            <button
              type="button"
              onClick={handleDeactivate}
              disabled={saving || !destinationId}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #fecaca",
                background: "#fff5f5",
                color: "#b42318",
                cursor: saving || !destinationId ? "not-allowed" : "pointer",
                fontWeight: 700
              }}
            >
              Деактивировать
            </button>
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
                src={form.qr_image_url}
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
                {form.qr_image_url ? "Превью недоступно." : "Добавьте ссылку на изображение QR, чтобы увидеть лёгкое превью."}
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
      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>{title}</div>
      <div style={{ fontSize: "12px", lineHeight: 1.45, color: "#6b7280" }}>{note}</div>
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
      title: "Оплата требует внимания",
      tone: "#b42318",
      bg: "#fff5f5",
      border: "#f5c2c7",
      note: billingBlockReason || "Доступ ограничен до оплаты"
    }
  }

  if (state === "grace") {
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

    alert("Настройки сохранены локально")
  }

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSection title="Настройки салона">
          <div style={{ color: "#6b7280" }}>Загружаем настройки салона…</div>
        </PageSection>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <PageSection title="Настройки салона">
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fff5f5",
              color: "#b42318",
              borderRadius: "12px",
              padding: "14px"
            }}
          >
            Не удалось загрузить настройки. {error}
          </div>
        </PageSection>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px" }}>
      <PageSection title="Настройки салона">
        <div
          style={{
            border: `1px solid ${billingUi.border}`,
            background: billingUi.bg,
            color: billingUi.tone,
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "16px"
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 800, marginBottom: "6px" }}>{billingUi.title}</div>
          <div style={{ fontSize: "13px", lineHeight: 1.45 }}>{billingUi.note}</div>
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#344054" }}>
            Запись: <strong>{canWrite ? "доступна" : "ограничена"}</strong> · Выплаты: <strong>{canWithdraw ? "доступны" : "ограничены"}</strong>
          </div>
        </div>

        <Block title="Профиль салона" hint="Базовые данные салона. Эта страница не тянет тяжёлые списки записей, клиентов и финансов.">
          <Field label="Название салона" value={name} onChange={setName} />
          <Field label="Обложка / фото (URL)" value={photo} onChange={setPhoto} placeholder="https://..." />
          <Field label="Описание" value={description} onChange={setDescription} />
          <Field label="Город" value={city} onChange={setCity} />
        </Block>

        <Block title="Контакты" hint="Операционные контакты салона для клиентов и команды.">
          <Field label="Телефон" value={phone} onChange={setPhone} />
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />
        </Block>

        <Block title="Параметры записи" hint="Локальные параметры формы и расписания. Управление услугами и мастерами вынесено в отдельные страницы.">
          <Field label="Шаг слота (мин)" value={slot} onChange={setSlot} type="number" />
          <Field label="Минимум до записи (мин)" value={minBefore} onChange={setMinBefore} type="number" />
          <Field label="Максимум вперёд (дней)" value={advance} onChange={setAdvance} type="number" />
        </Block>

        <Block title="Billing / доступ" hint="Read-only блок. Здесь только статус и маршруты в профильные страницы, без тяжёлых таблиц.">
          <ReadonlyRow label="Salon slug" value={slug} />
          <ReadonlyRow label="Billing model" value={billingModel} />
          <ReadonlyRow label="Статус подписки" value={subscriptionStatus} />
          <ReadonlyRow
            label="Период до"
            value={currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleString("ru-RU") : "—"}
          />
          <ReadonlyRow label="Запись" value={canWrite ? "доступна" : "ограничена"} />
          <ReadonlyRow label="Выплаты" value={canWithdraw ? "доступны" : "ограничены"} />

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
              title="Открыть услуги"
              note="Управление каталогом салона и подключением услуг мастеров."
            />
            <QuickLink
              to={buildSalonPath(slug, "masters")}
              title="Открыть мастеров"
              note="Список команды, статусы и доступ к рабочей нагрузке."
            />
            <QuickLink
              to={buildSalonPath(slug, "finance")}
              title="Открыть финансы"
              note="Краткий обзор денег, статуса подписки и финансовых переходов."
            />
            <QuickLink
              to={buildSalonPath(slug, "contracts")}
              title="Открыть контракты"
              note="Привязки мастеров и договорные условия без смешения с финансами."
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
        />

        <Block title="Публичная ссылка и QR" hint="Быстрый доступ к ссылке записи и QR-коду для клиентов.">
          <OwnerBookingQrCard
            ownerType="salon"
            slug={slug}
            title="QR для записи в салон"
            subtitle="Клиент откроет форму записи салона."
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
        >
          Сохранить
        </button>
      </PageSection>
    </div>
  )
}
