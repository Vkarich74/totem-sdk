import { useState } from "react"

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "")

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
    "#/admin/mobile",
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
      const response = await fetch(`${API_BASE}/internal/admin/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const payload = await response.json()

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `HTTP_${response.status}`)
      }

      const token = String(payload?.access_token || "").trim()

      if (!token) {
        throw new Error("NO_ACCESS_TOKEN")
      }

      window.localStorage.setItem("TOTEM_AUTH_TOKEN", token)
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
      <h1 style={{ margin: "0 0 16px" }}>Admin Login</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {error ? (
        <div style={{ marginTop: 12, color: "#b42318" }}>{error}</div>
      ) : null}
    </div>
  )
}
