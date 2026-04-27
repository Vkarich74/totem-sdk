import { useEffect, useMemo, useState } from "react"
import AdminNavigation from "../AdminNavigation"
import {
  approveAdminOpenOwnerRequest,
  createAdminOpenOwnerRequest,
  getAdminOpenOwnerAudit,
  getAdminOpenOwnerStats,
  listAdminOpenOwnerRequests,
  precheckAdminOpenOwner,
  previewAdminOpenOwnerEmail,
  provisionAdminOpenOwnerRequest,
  sendAdminOpenOwnerEmail,
} from "../../api/internal"

function formatDateTime(value){
  if(!value){
    return "-"
  }

  try{
    const date = new Date(value)
    if(Number.isNaN(date.getTime())){
      return String(value)
    }

    return date.toLocaleString("ru-RU", {
      timeZone: "Asia/Bishkek",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }catch(e){
    return String(value || "-")
  }
}

function stringifyValue(value){
  if(value === null || value === undefined || value === ""){
    return "-"
  }

  if(typeof value === "string"){
    return value
  }

  try{
    return JSON.stringify(value)
  }catch(e){
    return "-"
  }
}

function buildDefaultForm(){
  return {
    owner_type: "salon",
    name: "",
    slug: "",
    email: "",
    phone: "",
    city: "Бишкек",
    address: "",
    description: "",
    specialization: "",
    work_mode: "independent",
    salon_slug: "",
    admin_notes: "",
  }
}

function normalizeRequestList(result){
  if(Array.isArray(result?.requests)){
    return result.requests
  }

  if(Array.isArray(result?.result?.requests)){
    return result.result.requests
  }

  return []
}

function normalizeStats(result){
  return result?.stats || result?.result || null
}

function getStatusLabel(status){
  switch(String(status || "")){
    case "validated":
      return "Проверен"
    case "approved":
      return "Одобрен"
    case "provisioning":
      return "Открывается"
    case "provisioned":
      return "Доступ создан"
    case "email_ready":
      return "Email готов"
    case "email_sent":
      return "Email отправлен"
    case "email_failed":
      return "Email ошибка"
    case "failed":
      return "Ошибка открытия"
    case "rejected":
      return "Отклонён"
    default:
      return status || "-"
  }
}

function canApprove(request){
  return String(request?.status || "") === "validated"
}

function canProvision(request){
  return String(request?.status || "") === "approved"
}

function canPreviewEmail(request){
  const status = String(request?.status || "")
  return status === "provisioned" || status === "email_ready" || status === "email_failed" || status === "email_sent"
}

function canSendEmail(request){
  const status = String(request?.status || "")
  return status === "email_ready" || status === "email_failed"
}

export default function AdminOpenOwnerPage(){
  const [form, setForm] = useState(buildDefaultForm)
  const [stats, setStats] = useState(null)
  const [requests, setRequests] = useState([])
  const [selectedRequestId, setSelectedRequestId] = useState("")
  const [selectedRequest, setSelectedRequest] = useState(null)

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const [precheckResult, setPrecheckResult] = useState(null)
  const [emailPreview, setEmailPreview] = useState(null)
  const [audit, setAudit] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)

  async function loadData(){
    try{
      setLoading(true)
      setError("")

      const [statsResult, listResult] = await Promise.all([
        getAdminOpenOwnerStats(),
        listAdminOpenOwnerRequests({ limit: 100 }),
      ])

      if(!statsResult.ok){
        throw new Error(statsResult.error || "STATS_LOAD_FAILED")
      }

      if(!listResult.ok){
        throw new Error(listResult.error || "REQUESTS_LOAD_FAILED")
      }

      const nextStats = normalizeStats(statsResult)
      const nextRequests = normalizeRequestList(listResult)

      setStats(nextStats)
      setRequests(nextRequests)

      if(selectedRequestId){
        const found = nextRequests.find((item) => String(item.id) === String(selectedRequestId))
        setSelectedRequest(found || null)
      }
    }catch(e){
      setStats(null)
      setRequests([])
      setError(e?.message || "LOAD_FAILED")
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateFormField(name, value){
    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
      }

      if(name === "owner_type" && value === "salon"){
        next.work_mode = "independent"
        next.salon_slug = ""
      }

      return next
    })
  }

  async function runPrecheck(){
    try{
      setActionLoading(true)
      setError("")
      setNotice("")
      setPrecheckResult(null)

      const result = await precheckAdminOpenOwner(form)

      if(!result.ok){
        throw new Error(result.error || "PRECHECK_FAILED")
      }

      setPrecheckResult(result.result || result)
      setNotice(result.valid ? "Precheck PASS" : "Precheck FAILED")
    }catch(e){
      setError(e?.message || "PRECHECK_FAILED")
    }finally{
      setActionLoading(false)
    }
  }

  async function createRequest(){
    try{
      setActionLoading(true)
      setError("")
      setNotice("")

      const result = await createAdminOpenOwnerRequest(form)

      if(!result.ok){
        throw new Error(result.error || "CREATE_REQUEST_FAILED")
      }

      setNotice(`Request создан: ${result.request?.id || "-"}`)
      setSelectedRequestId(String(result.request?.id || ""))
      setSelectedRequest(result.request || null)
      setPrecheckResult(null)
      setEmailPreview(null)
      setAudit(null)
      setForm(buildDefaultForm())

      await loadData()
    }catch(e){
      setError(e?.message || "CREATE_REQUEST_FAILED")
    }finally{
      setActionLoading(false)
    }
  }

  async function runRequestAction(actionName, handler){
    if(!selectedRequest?.id){
      setError("REQUEST_NOT_SELECTED")
      return
    }

    try{
      setActionLoading(true)
      setError("")
      setNotice("")

      const result = await handler(selectedRequest.id)

      if(!result.ok){
        throw new Error(result.error || `${actionName}_FAILED`)
      }

      setSelectedRequest(result.request || selectedRequest)
      setNotice(`${actionName} PASS`)
      await loadData()
    }catch(e){
      setError(e?.message || `${actionName}_FAILED`)
    }finally{
      setActionLoading(false)
    }
  }

  async function runEmailPreview(){
    if(!selectedRequest?.id){
      setError("REQUEST_NOT_SELECTED")
      return
    }

    try{
      setActionLoading(true)
      setError("")
      setNotice("")
      setEmailPreview(null)

      const result = await previewAdminOpenOwnerEmail(selectedRequest.id)

      if(!result.ok){
        throw new Error(result.error || "EMAIL_PREVIEW_FAILED")
      }

      setSelectedRequest(result.request || selectedRequest)
      setEmailPreview(result.preview || null)
      setNotice("Email preview PASS")
      await loadData()
    }catch(e){
      setError(e?.message || "EMAIL_PREVIEW_FAILED")
    }finally{
      setActionLoading(false)
    }
  }

  async function runSendEmail(){
    await runRequestAction("SEND_EMAIL", sendAdminOpenOwnerEmail)
  }

  async function loadAudit(requestId = selectedRequest?.id){
    const safeId = String(requestId || "").trim()

    if(!safeId){
      setError("REQUEST_NOT_SELECTED")
      return
    }

    try{
      setAuditLoading(true)
      setError("")
      setAudit(null)

      const result = await getAdminOpenOwnerAudit(safeId)

      if(!result.ok){
        throw new Error(result.error || "AUDIT_LOAD_FAILED")
      }

      setAudit(result)
      setNotice("Audit loaded")
    }catch(e){
      setAudit(null)
      setError(e?.message || "AUDIT_LOAD_FAILED")
    }finally{
      setAuditLoading(false)
    }
  }

  function selectRequest(request){
    setSelectedRequestId(String(request?.id || ""))
    setSelectedRequest(request || null)
    setEmailPreview(null)
    setAudit(null)
    setNotice("")
    setError("")
  }

  const visibleStats = useMemo(() => {
    return {
      total: stats?.total ?? requests.length,
      byStatus: stats?.counts?.by_status || {},
      byOwnerType: stats?.counts?.by_owner_type || {},
      byEmailStatus: stats?.counts?.by_email_status || {},
      provision: stats?.counts?.provision || {},
      errors: stats?.counts?.errors || {},
    }
  }, [stats, requests.length])

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
  }, [requests])

  if(loading){
    return <div style={{ padding: 20 }}>Загрузка...</div>
  }

  if(error === "NO_AUTH" || error === "HTTP_401" || error === "HTTP_403"){
    return (
      <div style={{ padding: 20 }}>
        <AdminNavigation />
        <div>Требуется вход администратора</div>
        <a href="#/admin/login?returnTo=/admin/open-owner">Войти как администратор</a>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <AdminNavigation />

      <h1 style={{ margin: "0 0 16px" }}>Открытие владельца</h1>

      {error ? <div style={styles.errorBox}>Ошибка: {error}</div> : null}
      {notice ? <div style={styles.noticeBox}>{notice}</div> : null}

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Requests</div>
          <div style={styles.statValue}>{visibleStats.total}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Provisioned</div>
          <div style={styles.statValue}>{visibleStats.provision?.provisioned ?? 0}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Email sent</div>
          <div style={styles.statValue}>{visibleStats.byEmailStatus?.sent ?? 0}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Errors</div>
          <div style={styles.statValue}>
            {(Number(visibleStats.errors?.provision_failed || 0) + Number(visibleStats.errors?.email_failed || 0))}
          </div>
        </div>
      </div>

      <div style={styles.layoutGrid}>
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Новый салон / мастер</h2>

          <div style={styles.formGrid}>
            <label style={styles.label}>
              Тип
              <select
                value={form.owner_type}
                onChange={(event) => updateFormField("owner_type", event.target.value)}
                style={styles.input}
              >
                <option value="salon">Салон</option>
                <option value="master">Мастер</option>
              </select>
            </label>

            <label style={styles.label}>
              Название / имя
              <input
                value={form.name}
                onChange={(event) => updateFormField("name", event.target.value)}
                placeholder="Например: Bella Salon"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Slug
              <input
                value={form.slug}
                onChange={(event) => updateFormField("slug", event.target.value)}
                placeholder="bella-salon"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Email
              <input
                value={form.email}
                onChange={(event) => updateFormField("email", event.target.value)}
                placeholder="owner@example.com"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Телефон
              <input
                value={form.phone}
                onChange={(event) => updateFormField("phone", event.target.value)}
                placeholder="+996555123456"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Город
              <input
                value={form.city}
                onChange={(event) => updateFormField("city", event.target.value)}
                placeholder="Бишкек"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Адрес
              <input
                value={form.address}
                onChange={(event) => updateFormField("address", event.target.value)}
                placeholder="Адрес"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Описание
              <input
                value={form.description}
                onChange={(event) => updateFormField("description", event.target.value)}
                placeholder="Краткое описание"
                style={styles.input}
              />
            </label>

            {form.owner_type === "master" ? (
              <>
                <label style={styles.label}>
                  Режим мастера
                  <select
                    value={form.work_mode}
                    onChange={(event) => updateFormField("work_mode", event.target.value)}
                    style={styles.input}
                  >
                    <option value="independent">Независимый мастер</option>
                    <option value="attached_to_salon">Прикрепить к салону</option>
                  </select>
                </label>

                {form.work_mode === "attached_to_salon" ? (
                  <label style={styles.label}>
                    Slug салона
                    <input
                      value={form.salon_slug}
                      onChange={(event) => updateFormField("salon_slug", event.target.value)}
                      placeholder="totem-demo-salon"
                      style={styles.input}
                    />
                  </label>
                ) : null}
              </>
            ) : null}

            <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
              Admin notes
              <textarea
                value={form.admin_notes}
                onChange={(event) => updateFormField("admin_notes", event.target.value)}
                placeholder="Внутренняя заметка"
                style={{ ...styles.input, minHeight: 84, resize: "vertical" }}
              />
            </label>
          </div>

          <div style={styles.buttonRow}>
            <button type="button" onClick={runPrecheck} disabled={actionLoading} style={styles.secondaryButton}>
              Precheck
            </button>

            <button type="button" onClick={createRequest} disabled={actionLoading} style={styles.primaryButton}>
              Create request
            </button>

            <button type="button" onClick={loadData} disabled={actionLoading} style={styles.secondaryButton}>
              Refresh
            </button>
          </div>

          {precheckResult ? (
            <div style={styles.resultBox}>
              <h3 style={styles.smallTitle}>Precheck result</h3>
              <div><strong>valid:</strong> {String(Boolean(precheckResult.valid))}</div>
              <div><strong>errors:</strong> {stringifyValue(precheckResult.errors || [])}</div>
              <div><strong>normalized:</strong> {stringifyValue(precheckResult.normalized)}</div>
            </div>
          ) : null}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Requests</h2>

          {sortedRequests.length === 0 ? (
            <div>Requests пустые</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {sortedRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => selectRequest(request)}
                  style={{
                    ...styles.requestCard,
                    borderColor: String(selectedRequestId) === String(request.id) ? "#111827" : "#e5e7eb",
                  }}
                >
                  <div><strong>#{request.id}</strong> {request.name || "-"}</div>
                  <div>{request.owner_type || "-"} / {request.slug_final || request.slug_requested || "-"}</div>
                  <div>{getStatusLabel(request.status)} / email: {request.email_status || "-"}</div>
                  <div>{formatDateTime(request.created_at)}</div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedRequest ? (
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Selected request #{selectedRequest.id}</h2>

          <div style={styles.detailGrid}>
            <div><strong>status:</strong> {selectedRequest.status || "-"}</div>
            <div><strong>email_status:</strong> {selectedRequest.email_status || "-"}</div>
            <div><strong>owner_type:</strong> {selectedRequest.owner_type || "-"}</div>
            <div><strong>slug:</strong> {selectedRequest.slug_final || "-"}</div>
            <div><strong>email:</strong> {selectedRequest.email || "-"}</div>
            <div><strong>phone:</strong> {selectedRequest.phone_normalized || selectedRequest.phone_raw || "-"}</div>
            <div><strong>created_owner_id:</strong> {selectedRequest.created_owner_id || "-"}</div>
            <div><strong>created_auth_user_id:</strong> {selectedRequest.created_auth_user_id || "-"}</div>
            <div><strong>message_id:</strong> {selectedRequest.message_id || "-"}</div>
            <div><strong>created_at:</strong> {formatDateTime(selectedRequest.created_at)}</div>
          </div>

          <div style={styles.buttonRow}>
            <button
              type="button"
              onClick={() => runRequestAction("APPROVE", approveAdminOpenOwnerRequest)}
              disabled={actionLoading || !canApprove(selectedRequest)}
              style={styles.primaryButton}
            >
              Approve
            </button>

            <button
              type="button"
              onClick={() => runRequestAction("PROVISION", provisionAdminOpenOwnerRequest)}
              disabled={actionLoading || !canProvision(selectedRequest)}
              style={styles.primaryButton}
            >
              Provision
            </button>

            <button
              type="button"
              onClick={runEmailPreview}
              disabled={actionLoading || !canPreviewEmail(selectedRequest)}
              style={styles.secondaryButton}
            >
              Email preview
            </button>

            <button
              type="button"
              onClick={runSendEmail}
              disabled={actionLoading || !canSendEmail(selectedRequest)}
              style={styles.secondaryButton}
            >
              Send email
            </button>

            <button
              type="button"
              onClick={() => loadAudit(selectedRequest.id)}
              disabled={auditLoading}
              style={styles.secondaryButton}
            >
              Audit
            </button>
          </div>

          {emailPreview ? (
            <div style={styles.resultBox}>
              <h3 style={styles.smallTitle}>Email preview</h3>
              <div><strong>to:</strong> {emailPreview.to || "-"}</div>
              <div><strong>subject:</strong> {emailPreview.subject || "-"}</div>
              <pre style={styles.pre}>{emailPreview.text || "-"}</pre>
            </div>
          ) : null}
        </section>
      ) : null}

      {audit ? (
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Audit request #{audit.request_id}</h2>

          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Events</div>
              <div style={styles.statValue}>{audit.audit_events.length}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Messages</div>
              <div style={styles.statValue}>{audit.messages.length}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Traces</div>
              <div style={styles.statValue}>{audit.traces.length}</div>
            </div>
          </div>

          <div style={styles.auditGrid}>
            <div>
              <h3 style={styles.smallTitle}>Audit events</h3>
              {audit.audit_events.length === 0 ? <div>Пусто</div> : audit.audit_events.map((item) => (
                <div key={item.id} style={styles.auditCard}>
                  <div><strong>{item.event_type || "-"}</strong></div>
                  <div>{formatDateTime(item.created_at)}</div>
                  <div>{stringifyValue(item.data)}</div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={styles.smallTitle}>Messages</h3>
              {audit.messages.length === 0 ? <div>Пусто</div> : audit.messages.map((item) => (
                <div key={item.id} style={styles.auditCard}>
                  <div><strong>message #{item.id}</strong> / {item.status || "-"}</div>
                  <div>{formatDateTime(item.created_at)}</div>
                  <div>{stringifyValue(item.data)}</div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={styles.smallTitle}>Traces</h3>
              {audit.traces.length === 0 ? <div>Пусто</div> : audit.traces.map((item) => (
                <div key={item.id} style={styles.auditCard}>
                  <div><strong>trace #{item.id}</strong> / {item.status || "-"}</div>
                  <div>message_id: {item.message_id || "-"}</div>
                  <div>{formatDateTime(item.created_at)}</div>
                  <div>{stringifyValue(item.data)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

const styles = {
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 12,
    background: "#fff",
  },
  statLabel: {
    color: "#666",
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
  },
  layoutGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 1.2fr) minmax(280px, 0.8fr)",
    gap: 16,
    alignItems: "start",
  },
  panel: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 16,
    background: "#fff",
    marginBottom: 16,
  },
  panelTitle: {
    margin: "0 0 12px",
  },
  smallTitle: {
    margin: "0 0 8px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  label: {
    display: "grid",
    gap: 6,
    fontWeight: 700,
  },
  input: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "10px 12px",
    font: "inherit",
    fontWeight: 400,
  },
  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  primaryButton: {
    border: "1px solid #111",
    borderRadius: 8,
    background: "#111",
    color: "#fff",
    padding: "9px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #111",
    borderRadius: 8,
    background: "#fff",
    color: "#111",
    padding: "9px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  requestCard: {
    display: "grid",
    gap: 4,
    width: "100%",
    textAlign: "left",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    background: "#fff",
    cursor: "pointer",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 8,
    marginBottom: 10,
  },
  auditGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
  },
  auditCard: {
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 10,
    background: "#fafafa",
    wordBreak: "break-word",
    marginBottom: 8,
  },
  errorBox: {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontWeight: 700,
  },
  noticeBox: {
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontWeight: 700,
  },
  resultBox: {
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 12,
    background: "#fafafa",
    marginTop: 12,
    wordBreak: "break-word",
  },
  pre: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 10,
  },
}
