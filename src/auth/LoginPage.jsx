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
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f9fafb"
    }}>
      <div style={{
        width: "360px",
        padding: "24px",
        background: "#fff",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ marginBottom: "16px" }}>Вход</h2>

        <div style={{ marginBottom: "16px" }}>
          <button onClick={() => setMode("password")}>Пароль</button>
          <button onClick={() => setMode("otp")} style={{ marginLeft: "10px" }}>Код</button>
        </div>

        <form onSubmit={mode === "password" ? handlePasswordLogin : handleOtpStart}>
          <input
            type="text"
            placeholder="Email или телефон"
            value={login}
            onChange={e => setLogin(e.target.value)}
            style={{ width: "100%", marginBottom: "12px" }}
          />

          {mode === "password" && (
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: "100%", marginBottom: "12px" }}
            />
          )}

          {error && (
            <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Загрузка..." : "Войти"}
          </button>
        </form>

        <div style={{ marginTop: "12px", textAlign: "right" }}>
          <a
            href={buildForgotPasswordHref() || "#"}
            onClick={handleForgotPasswordClick}
            style={{ fontSize: "14px" }}
          >
            Забыли пароль?
          </a>
        </div>
      </div>
    </div>
  )
}
