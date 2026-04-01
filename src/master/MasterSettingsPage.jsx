import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useMaster } from "./MasterContext"
import PageSection from "../cabinet/PageSection"

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
