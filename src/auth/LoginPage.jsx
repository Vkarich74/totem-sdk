import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { authLogin, authStart, clearAuthAccessToken } from "../api/internal"


function decodeAuthTokenRole(token){
  try{
    const payload = String(token || "").split(".")[1]

    if(!payload){
      return ""
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=")
    const parsed = JSON.parse(window.atob(padded))

    return String(parsed?.role || "").trim().toLowerCase()
  }catch{
    return ""
  }
}

function clearAdminTokenForCabinetLogin(){
  const authToken = window.localStorage.getItem("TOTEM_AUTH_TOKEN")
  const accessToken = window.localStorage.getItem("TOTEM_ACCESS_TOKEN")

  if(decodeAuthTokenRole(authToken) === "admin"){
    window.localStorage.removeItem("TOTEM_AUTH_TOKEN")
  }

  if(decodeAuthTokenRole(accessToken) === "admin"){
    window.localStorage.removeItem("TOTEM_ACCESS_TOKEN")
  }
}

function shouldClearAdminToken(originRole){
  return originRole === "master" || originRole === "salon_admin"
}

function isOwnerRole(role){
  const normalizedRole = String(role || "").trim().toLowerCase()
  return normalizedRole === "master" || normalizedRole === "salon_admin"
}

function parseJsonLike(value){
  if(!value){
    return null
  }

  if(typeof value === "object"){
    return value
  }

  const text = String(value || "").trim()
  if(!text){
    return null
  }

  try{
    return JSON.parse(text)
  }catch{
    return null
  }
}

function getApiErrorMeta(result){
  const detail = result?.detail || null
  const parsed = parseJsonLike(detail?.json || detail?.text)
  const code = String(
    result?.error ||
    detail?.code ||
    detail?.error ||
    parsed?.code ||
    parsed?.error ||
    ""
  ).trim()
  const status = Number(detail?.status || parsed?.status || 0) || 0
  const contexts = Array.isArray(parsed?.contexts)
    ? parsed.contexts
    : Array.isArray(parsed?.auth_contexts)
      ? parsed.auth_contexts
      : Array.isArray(parsed?.data?.contexts)
        ? parsed.data.contexts
        : []

  return {
    code,
    status,
    contexts,
    raw: parsed || detail || null
  }
}

function resolveOwnerSlugFromAuthResponse(result){
  const candidates = [
    result?.auth?.slug,
    result?.auth?.owner_slug,
    result?.auth?.salon_slug,
    result?.auth?.master_slug,
    result?.auth_context?.slug,
    result?.slug,
    result?.owner_slug
  ]

  for(const candidate of candidates){
    const slug = String(candidate || "").trim()
    if(slug){
      return slug
    }
  }

  return ""
}

function getLoginSubtitle(role){
  const normalizedRole = String(role || "").trim().toLowerCase()

  if(normalizedRole === "master"){
    return "Вход в кабинет мастера"
  }

  if(normalizedRole === "salon_admin"){
    return "Вход в кабинет салона"
  }

  return "Вход в кабинет"
}

export default function LoginPage(){
  const navigate = useNavigate()
  const location = useLocation()

  const query = new URLSearchParams(location.search)
  const originRole = String(query.get("role") || "").trim().toLowerCase()
  const effectiveRole = String(query.get("role") || "").trim().toLowerCase()
  const effectiveSlug = String(query.get("slug") || "").trim()

  const [mode, setMode] = useState("password")
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const loginSubtitle = getLoginSubtitle(effectiveRole)

  function buildForgotPasswordHref(){
    if(!effectiveRole || !effectiveSlug){
      return ""
    }

    const params = new URLSearchParams({
      role: effectiveRole,
      slug: effectiveSlug
    })

    if(login.trim()){
      params.set("login", login.trim())
    }

    return `#/auth/forgot-password?${params.toString()}`
  }

  function handleForgotPasswordClick(e){
    const href = buildForgotPasswordHref()

    if(!href){
      e.preventDefault()
      if(!effectiveRole){
        setError("Ошибка контекста входа")
        return
      }

      if(isOwnerRole(effectiveRole) && !effectiveSlug){
        setError("Для восстановления пароля откройте ссылку конкретного кабинета или обратитесь в поддержку.")
        return
      }

      setError("Ошибка контекста входа")
    }
  }

  useEffect(() => {
    if(shouldClearAdminToken(originRole)){
      clearAdminTokenForCabinetLogin()
    }
  }, [originRole])

  function redirectToCabinet(targetRole, targetSlug){
    const resolvedRole = String(targetRole || effectiveRole || "").trim().toLowerCase()
    const resolvedSlug = String(targetSlug || "").trim() || effectiveSlug

    if(!resolvedSlug){
      clearAuthAccessToken()
      setError("Кабинет найден, но ссылка кабинета не определена.")
      return false
    }

    if(resolvedRole === "master"){
      navigate(`/master/${encodeURIComponent(resolvedSlug)}/dashboard`, { replace: true })
      return true
    }

    if(resolvedRole === "salon_admin"){
      navigate(`/salon/${encodeURIComponent(resolvedSlug)}/dashboard`, { replace: true })
      return true
    }

    navigate("/", { replace: true })
    return true
  }

  function isMultipleOwnerContextsError(result){
    const meta = getApiErrorMeta(result)

    if(meta.code === "MULTIPLE_OWNER_CONTEXTS"){
      return true
    }

    if(meta.status === 409 && meta.contexts.length > 1){
      return true
    }

    const rawText = String(result?.detail?.text || "").toUpperCase()
    if(rawText.includes("MULTIPLE_OWNER_CONTEXTS")){
      return true
    }

    return false
  }

  function resolveLoginOwnerSlug(result){
    return resolveOwnerSlugFromAuthResponse(result)
  }

  async function handlePasswordLogin(e){
    e.preventDefault()

    if(!effectiveRole){
      setError("Ошибка контекста входа")
      return
    }

    if(!effectiveSlug && !isOwnerRole(effectiveRole)){
      setError("Ошибка контекста входа")
      return
    }

    if(shouldClearAdminToken(originRole)){
      clearAdminTokenForCabinetLogin()
    }

    setLoading(true)
    setError("")

    try{
      const res = await authLogin({
        login,
        password,
        role: effectiveRole,
        ...(effectiveSlug ? { slug: effectiveSlug } : {})
      })

      if(res?.ok && res?.access_token){
        const resolvedSlug = resolveLoginOwnerSlug(res)

        if(!effectiveSlug && isOwnerRole(effectiveRole) && !resolvedSlug){
          clearAuthAccessToken()
          setError("Кабинет найден, но ссылка кабинета не определена.")
          return
        }

        redirectToCabinet(effectiveRole, resolvedSlug || effectiveSlug)
        return
      }

      if(isMultipleOwnerContextsError(res)){
        setError("Найдено несколько кабинетов. Выберите точную ссылку кабинета или обратитесь в поддержку.")
        return
      }

      setError("Вход не завершён: токен авторизации не получен")
    }catch(e){
      setError("Ошибка входа")
    }finally{
      setLoading(false)
    }
  }

  async function handleOtpStart(e){
    e.preventDefault()

    if(!effectiveRole){
      setError("Ошибка контекста входа")
      return
    }

    if(!effectiveSlug && !isOwnerRole(effectiveRole)){
      setError("Ошибка контекста входа")
      return
    }

    if(shouldClearAdminToken(originRole)){
      clearAdminTokenForCabinetLogin()
    }

    setLoading(true)
    setError("")

    try{
      const res = await authStart({
        login,
        purpose: "login",
        role: effectiveRole,
        ...(effectiveSlug ? { slug: effectiveSlug } : {})
      })

      if(res?.ok){
        const resolvedSlug = resolveOwnerSlugFromAuthResponse(res?.result)

        if(!effectiveSlug && isOwnerRole(effectiveRole) && !resolvedSlug){
          clearAuthAccessToken()
          setError("Кабинет найден, но ссылка кабинета не определена.")
          return
        }

        navigate(
          `/auth/verify?role=${encodeURIComponent(effectiveRole)}${resolvedSlug || effectiveSlug ? `&slug=${encodeURIComponent(resolvedSlug || effectiveSlug)}` : ""}`,
          {
            state: {
              login
            }
          }
        )
        return
      }

      if(isMultipleOwnerContextsError(res)){
        setError("Найдено несколько кабинетов. Выберите точную ссылку кабинета или обратитесь в поддержку.")
        return
      }

      setError("Не удалось отправить код")
    }catch(e){
      setError("Ошибка отправки кода")
    }finally{
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      padding: "20px 16px 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 52%, #f8fafc 100%)",
      color: "#111827"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        display: "grid",
        gap: "14px"
      }}>
        <div style={{
          borderRadius: "24px",
          padding: "20px",
          background: "linear-gradient(135deg, #111827 0%, #1d4ed8 52%, #3b82f6 100%)",
          color: "#fff",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "flex-start",
            marginBottom: "18px"
          }}>
            <div>
              <div style={{ fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
                TOTEM Auth
              </div>
              <h1 style={{ margin: "10px 0 8px", fontSize: "28px", lineHeight: 1.05 }}>
                Вход
              </h1>
              <div style={{ fontSize: "14px", lineHeight: 1.5, color: "rgba(255,255,255,0.9)" }}>
                {loginSubtitle}
              </div>
            </div>
            <a
              href="/"
              style={{
                textDecoration: "none",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                padding: "8px 12px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)"
              }}
            >
              На главную
            </a>
          </div>

          <div style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap"
          }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.14)",
              fontSize: "12px",
              fontWeight: 700
            }}>
              Безопасный вход
            </span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.14)",
              fontSize: "12px",
              fontWeight: 700
            }}>
              Кабинет по роли
            </span>
          </div>
        </div>

        <div style={{
          background: "#fff",
          borderRadius: "24px",
          padding: "18px",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(226,232,240,0.9)"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginBottom: "16px",
            background: "#f8fafc",
            padding: "6px",
            borderRadius: "18px"
          }}>
            <button
              type="button"
              onClick={() => setMode("password")}
              aria-pressed={mode === "password"}
              style={{
                minHeight: "48px",
                border: "none",
                borderRadius: "14px",
                background: mode === "password" ? "#111827" : "transparent",
                color: mode === "password" ? "#fff" : "#334155",
                fontSize: "15px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: mode === "password" ? "0 8px 18px rgba(17,24,39,0.18)" : "none"
              }}
            >
              Пароль
            </button>
            <button
              type="button"
              onClick={() => setMode("otp")}
              aria-pressed={mode === "otp"}
              style={{
                minHeight: "48px",
                border: "none",
                borderRadius: "14px",
                background: mode === "otp" ? "#111827" : "transparent",
                color: mode === "otp" ? "#fff" : "#334155",
                fontSize: "15px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: mode === "otp" ? "0 8px 18px rgba(17,24,39,0.18)" : "none"
              }}
            >
              Код
            </button>
          </div>

          <div style={{
            fontSize: "13px",
            lineHeight: 1.5,
            color: "#475569",
            marginBottom: "14px"
          }}>
            Вход защищён. После подтверждения доступа вы перейдёте в кабинет вашей роли.
          </div>

          <form onSubmit={mode === "password" ? handlePasswordLogin : handleOtpStart}>
            <input
              type="text"
              placeholder="Email или телефон"
              value={login}
              onChange={e => setLogin(e.target.value)}
              autoComplete="username"
              style={{
                width: "100%",
                minHeight: "52px",
                marginBottom: "12px",
                borderRadius: "16px",
                border: "1px solid #dbe3ee",
                padding: "0 14px",
                fontSize: "16px",
                outline: "none",
                background: "#fff",
                color: "#111827"
              }}
            />

            {mode === "password" && (
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: "100%",
                  minHeight: "52px",
                  marginBottom: "12px",
                  borderRadius: "16px",
                  border: "1px solid #dbe3ee",
                  padding: "0 14px",
                  fontSize: "16px",
                  outline: "none",
                  background: "#fff",
                  color: "#111827"
                }}
              />
            )}

            {error && (
              <div style={{
                marginBottom: "12px",
                padding: "12px 14px",
                borderRadius: "16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "14px",
                lineHeight: 1.45
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                minHeight: "52px",
                border: "none",
                borderRadius: "16px",
                background: loading ? "#93c5fd" : "linear-gradient(135deg, #1d4ed8 0%, #111827 100%)",
                color: "#fff",
                fontSize: "16px",
                fontWeight: 800,
                cursor: loading ? "wait" : "pointer",
                boxShadow: "0 14px 24px rgba(29,78,216,0.22)"
              }}
            >
              {loading ? "Загрузка..." : "Войти"}
            </button>
          </form>

          <div style={{
            marginTop: "14px",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center"
          }}>
            <div style={{
              fontSize: "12px",
              lineHeight: 1.45,
              color: "#64748b",
              maxWidth: "220px"
            }}>
              Доступ открыт только для вашей роли и кабинета. Если ссылка кабинета потеряна, используйте восстановление.
            </div>
            <a
              href={buildForgotPasswordHref() || "#"}
              onClick={handleForgotPasswordClick}
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#1d4ed8",
                textDecoration: "none",
                whiteSpace: "nowrap"
              }}
            >
              Забыли пароль?
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
