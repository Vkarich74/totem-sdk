import { useState } from "react"

import { adminLogin } from "../../api/internal.js"

function getReturnTo(){
  const hash = window.location.hash || ""
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : window.location.search.slice(1)
  const value = new URLSearchParams(query).get("returnTo") || ""

  return value.trim()
}

function getAdminTargetHash(returnTo){
  const normalized = returnTo.startsWith("#") ? returnTo : `#${returnTo}`
  const allowedTargets = new Set([
    "#/admin",
    "#/admin/messages",
    "#/admin/leads",
    "#/admin/cases",
    "#/admin/clients",
    "#/admin/owners",
    "#/admin/open-owner",
    "#/admin/withdrawals",
    "#/admin/notifications",
    "#/admin/mobile",
    "#/admin/finance",
  ])

  return allowedTargets.has(normalized) ? normalized : "#/admin"
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await adminLogin({email,password})
      const returnTo = getReturnTo()
      const targetHash = returnTo ? getAdminTargetHash(returnTo) : "#/admin"
      window.location.hash = targetHash
      window.location.reload()
    } catch (err) {
      setError(err?.message || "LOGIN_FAILED")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 420 }}>
      <h1 style={{ margin: "0 0 16px" }}>Вход администратора</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Электронная почта</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Пароль</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>

      {error ? (
        <div style={{ marginTop: 12, color: "#b42318" }}>{error}</div>
      ) : null}
    </div>
  )
}
