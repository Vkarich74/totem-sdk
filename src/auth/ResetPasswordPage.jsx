import { useMarketContext } from "../market/MarketContext.jsx";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authLogin, finishPasswordReset } from "../api/internal";

function normalizeEmail(value){
  return String(value || "").trim().toLowerCase();
}

export default function ResetPasswordPage(){
  const { t } = useMarketContext();
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const role = String(query.get("role") || "").trim().toLowerCase();
  const slug = String(query.get("slug") || "").trim().toLowerCase();
  const initialLogin = normalizeEmail(query.get("login") || "");

  const initialEmail = useMemo(() => {
    return initialLogin || normalizeEmail(location.state?.email || "");
  }, [initialLogin, location.state]);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e){
    e.preventDefault();
    setError("");
    setSuccess("");

    if(!role || !slug){
      setError("auth.contextError");
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = String(code || "").trim();
    const normalizedPassword = String(password || "");
    const normalizedConfirm = String(confirmPassword || "");

    if(!normalizedEmail || !normalizedEmail.includes("@")){
      setError("auth.emailRequired");
      return;
    }

    if(normalizedCode.length !== 6){
      setError("auth.codeRequired");
      return;
    }

    if(normalizedPassword.length < 8){
      setError("auth.passwordShort");
      return;
    }

    if(normalizedPassword !== normalizedConfirm){
      setError("auth.passwordMismatch");
      return;
    }

    setLoading(true);

    try{
      const result = await finishPasswordReset({
        email: normalizedEmail,
        code: normalizedCode,
        password: normalizedPassword,
        role,
        slug
      });

      if(!result?.ok){
        setError("auth.resetFailed");
        setLoading(false);
        return;
      }

      setSuccess("auth.passwordUpdated");

      const loginResult = await authLogin({
        login: normalizedEmail,
        password: normalizedPassword,
        role,
        slug
      });

      if(loginResult?.ok && loginResult?.access_token){
        window.localStorage.setItem("TOTEM_AUTH_TOKEN", loginResult.access_token);
        navigate(
          role === "master"
            ? `/master/${slug}/dashboard`
            : `/salon/${slug}/dashboard`,
          { replace: true }
        );
        return;
      }

      navigate(
        `/auth/login?role=${encodeURIComponent(role)}&slug=${encodeURIComponent(slug)}&login=${encodeURIComponent(normalizedEmail)}`,
        { replace: true }
      );
    }catch(e){
      setError("auth.resetError");
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
        <h2 style={{ margin: "0 0 12px 0", fontSize: "24px" }}>{t("auth.resetTitle")}</h2>
        <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: "14px" }}>
          {t("auth.resetInfo")}
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "12px" }}>
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>{t("auth.email")}</div>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
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
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>{t("auth.code")}</div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("auth.codePlaceholder")}
              style={{
                width: "100%",
                height: "42px",
                padding: "0 12px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                boxSizing: "border-box",
                letterSpacing: "2px"
              }}
            />
          </label>

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
            {loading ? t("auth.saving") : t("auth.resetPassword")}
          </button>
        </form>
      </div>
    </div>
  );
}

