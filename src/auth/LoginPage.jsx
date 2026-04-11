import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { authLogin, authStart } from "../api/internal"

export default function LoginPage(){
  const navigate = useNavigate()
  const location = useLocation()

  // ВАЖНО: получаем из URL state (роль + slug)
  const role = location.state?.role
  const slug = location.state?.slug

  const [mode, setMode] = useState("password") // password | otp
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handlePasswordLogin(e){
    e.preventDefault()

    if(!role || !slug){
      setError("Ошибка контекста входа")
      return
    }

    setLoading(true)
    setError("")

    try{
      const res = await authLogin({
        login,
        password,
        role,
        slug
      })

      if(res?.ok){
        navigate("/", { replace: true })
        return
      }

      setError("Неверный логин или пароль")
    }catch(e){
      setError("Ошибка входа")
    }finally{
      setLoading(false)
    }
  }

  async function handleOtpStart(e){
    e.preventDefault()

    if(!role || !slug){
      setError("Ошибка контекста входа")
      return
    }

    setLoading(true)
    setError("")

    try{
      const res = await authStart({
        login,
        purpose: "login",
        role,
        slug
      })

      if(res?.ok){
        navigate("/auth/verify", {
          state: {
            login,
            role,
            slug
          }
        })
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
      </div>
    </div>
  )
}