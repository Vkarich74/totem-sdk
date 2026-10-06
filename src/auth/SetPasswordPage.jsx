import { useMarketContext } from "../market/MarketContext.jsx";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setPassword } from "../api/internal";

export default function SetPasswordPage(){
  const { t } = useMarketContext();
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const role = String(query.get("role") || "").trim().toLowerCase();
  const slug = String(query.get("slug") || "").trim().toLowerCase();
  const login = String(query.get("login") || "").trim();

  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e){
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalizedPassword = String(password || "");

    if(normalizedPassword.length < 8){
      setError("auth.passwordShort");
      return;
    }

    if(normalizedPassword !== String(confirmPassword || "")){
      setError("auth.passwordMismatch");
      return;
    }

    setLoading(true);

    try{
      const saveResult = await setPassword({ password: normalizedPassword });

      if(!saveResult?.ok){
        setError("auth.savePasswordFailed");
        setLoading(false);
        return;
      }

      setSuccess("auth.passwordSaved");

      if(role && slug){
        const params = new URLSearchParams({
          role,
          slug
        });

        if(login){
          params.set("login", login);
        }

        navigate(`/auth/login?${params.toString()}`, { replace: true });
        return;
      }

      navigate("/auth/login", { replace: true });
    }catch(e){
      setError("auth.savePasswordError");
    }finally{
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
        padding: "24px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          padding: "24px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "24px" }}>{t("auth.setTitle")}</h2>
        <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: "14px" }}>
          {t("auth.setInfo")}
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "12px" }}>
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>{t("auth.newPassword")}</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              style={{
                width: "100%",
                height: "42px",
                padding: "0 12px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                boxSizing: "border-box"
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "12px" }}>
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>{t("auth.confirmPassword")}</div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("auth.confirmPassword")}
              style={{
                width: "100%",
                height: "42px",
                padding: "0 12px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                boxSizing: "border-box"
              }}
            />
          </label>

          {error ? (
            <div role="alert" style={{ color: "#b91c1c", marginBottom: "12px", fontSize: "14px" }}>
              {t(error)}
            </div>
          ) : null}

          {success ? (
            <div role="status" aria-live="polite" style={{ color: "#065f46", marginBottom: "12px", fontSize: "14px" }}>
              {t(success)}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "44px",
              border: "none",
              borderRadius: "10px",
              background: "#111827",
              color: "#ffffff",
              fontWeight: 600,
              cursor: loading ? "default" : "pointer"
            }}
          >
            {loading ? t("auth.saving") : t("auth.savePassword")}
          </button>
        </form>
      </div>
    </div>
  );
}

