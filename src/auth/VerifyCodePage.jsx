import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyAuth } from "../api/internal";

function resolveRedirectTarget(effectiveRole, effectiveSlug){
  const safeRole = String(effectiveRole || "").trim();
  const safeSlug = String(effectiveSlug || "").trim();

  if(safeRole === "master" && safeSlug){
    return `/master/${safeSlug}`;
  }

  if(safeSlug){
    return `/salon/${safeSlug}`;
  }

  return "/";
}

export default function VerifyCodePage(){
  const navigate = useNavigate();
  const location = useLocation();

  const initialLogin = useMemo(() => {
    return String(location.state?.login || "").trim();
  }, [location.state]);

  const initialRole = useMemo(() => {
    return String(location.state?.role || "").trim();
  }, [location.state]);

  const initialSlug = useMemo(() => {
    return String(location.state?.slug || "").trim();
  }, [location.state]);

  const query = new URLSearchParams(location.search);
  const effectiveRole = initialRole || query.get("role") || "";
  const effectiveSlug = initialSlug || query.get("slug") || "";

  const [login, setLogin] = useState(initialLogin);
  const [code, setCode] = useState("");
  const [role] = useState(initialRole);
  const [slug] = useState(initialSlug);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e){
    e.preventDefault();

    if(!login || !effectiveRole || !effectiveSlug){
      setError("Ошибка контекста подтверждения");
      return;
    }

    setLoading(true);
    setError("");

    try{
      const payload = {
        login: String(login || "").trim(),
        code: String(code || "").trim(),
        purpose: "login",
        role: effectiveRole,
        slug: effectiveSlug
      };

      const res = await verifyAuth(payload);

      if(!res?.ok){
        setError("Неверный или просроченный код");
        setLoading(false);
        return;
      }

      const target = resolveRedirectTarget(res?.auth?.role || effectiveRole, res?.auth?.slug || effectiveSlug);
      navigate(target, { replace: true });
    }catch(e){
      setError("Ошибка подтверждения кода");
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
          maxWidth: "360px",
          padding: "24px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "24px" }}>Подтверждение кода</h2>
        <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: "14px" }}>
          Введите код подтверждения для входа.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "12px" }}>
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>Логин</div>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Email или телефон"
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
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>Код</div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6 цифр"
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

          {error ? (
            <div style={{ color: "#b91c1c", marginBottom: "12px", fontSize: "14px" }}>
              {error}
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
            {loading ? "Проверяем..." : "Подтвердить"}
          </button>
        </form>
      </div>
    </div>
  );
}
