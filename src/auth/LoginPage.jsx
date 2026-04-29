import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { authLogin, authStart } from "../api/internal"


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

export default function LoginPage(){
  const navigate = useNavigate()
  const location = useLocation()

  const query = new URLSearchParams(location.search)
  const originRole = String(query.get("role") || "").trim().toLowerCase()
  const effectiveRole = query.get("role") || ""
  const effectiveSlug = query.get("slug") || ""

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
      setError("Ошибка контекста входа")
    }
  }

  useEffect(() => {
    if(shouldClearAdminToken(originRole)){
      clearAdminTokenForCabinetLogin()
    }
  }, [originRole])

  function redirectToCabinet(){
    if(originRole === "master"){
      navigate(`/master/${effectiveSlug}`, { replace: true })
      return
    }
    if(originRole === "salon_admin"){
      navigate(`/salon/${effectiveSlug}`, { replace: true })
      return
    }
    navigate("/", { replace: true })
  }

  async function handlePasswordLogin(e){
    e.preventDefault()

    if(!effectiveRole || !effectiveSlug){
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
        slug: effectiveSlug
      })

      if(res?.ok && res?.access_token){
        redirectToCabinet()
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

    if(!effectiveRole || !effectiveSlug){
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
        slug: effectiveSlug
      })

      if(res?.ok){
        navigate(
          `/auth/verify?role=${encodeURIComponent(effectiveRole)}&slug=${encodeURIComponent(effectiveSlug)}`,
          {
            state: {
              login
            }
          }
        )
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
