import { useMarketContext } from "../market/MarketContext.jsx";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyAuth } from "../api/internal";

function normalizeVerifyRole(role, ownerType){
  const safeRole = String(role || "").trim().toLowerCase();
  const safeOwnerType = String(ownerType || "").trim().toLowerCase();

  if(safeRole === "master"){
    return "master";
  }

  if(safeRole === "salon_admin" || safeRole === "salon"){
    return "salon_admin";
  }

  if(safeOwnerType === "master"){
    return "master";
  }

  if(safeOwnerType === "salon"){
    return "salon_admin";
  }

  return "";
}

function resolveRedirectTarget(effectiveRole, effectiveSlug){
  const safeRole = String(effectiveRole || "").trim();
  const safeSlug = String(effectiveSlug || "").trim();

  if(safeRole === "master" && safeSlug){
    return `/master/${safeSlug}`;
  }

  if(safeRole === "salon_admin" && safeSlug){
    return `/salon/${safeSlug}`;
  }

  return "/";
}

export default function VerifyCodePage(){
  const { t } = useMarketContext();
  const navigate = useNavigate();
  const location = useLocation();

  const initialLogin = useMemo(() => {
    return String(location.state?.login || "").trim();
  }, [location.state]);

  const query = new URLSearchParams(location.search);
  const effectiveRole = normalizeVerifyRole(
    query.get("role"),
    query.get("owner_type")
  );
  const effectiveSlug = String(query.get("slug") || "").trim();
  const queryLogin = String(query.get("login") || "").trim();

  const [login, setLogin] = useState(initialLogin || queryLogin || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e){
    e.preventDefault();

    if(!login || !effectiveRole || !effectiveSlug){
      setError("auth.verifyContextError");
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

      if(!res?.ok || !res?.access_token){
        setError("auth.invalidCode");
        setLoading(false);
        return;
      }

      const target = resolveRedirectTarget(
        effectiveRole,
        res?.auth?.slug || effectiveSlug
      );
      navigate(target, { replace: true });
    }catch(e){
      setError("auth.verifyError");
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
        <h2 style={{ margin: "0 0 12px 0", fontSize: "24px" }}>{t("auth.verifyTitle")}</h2>
        <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: "14px" }}>
          {t("auth.verifyInfo")}
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "12px" }}>
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>{t("auth.login")}</div>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder={t("auth.loginPlaceholder")}
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

          {error ? (
            <div role="alert" style={{ color: "#b91c1c", marginBottom: "12px", fontSize: "14px" }}>
              {t(error)}
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
            {loading ? t("auth.checking") : t("auth.confirm")}
          </button>
        </form>
      </div>
    </div>
  );
}

