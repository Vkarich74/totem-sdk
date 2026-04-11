import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyAuth } from "../api/internal";

function normalizePhone(value){
  const raw = String(value || "").trim();
  if(!raw) return "";

  if(raw.startsWith("+996")){
    return raw;
  }

  const digits = raw.replace(/\D/g, "");
  if(digits.startsWith("996")){
    return `+${digits}`;
  }

  if(digits.length === 9){
    return `+996${digits}`;
  }

  return raw;
}

function resolveRedirectTarget(role, phone){
  const normalizedPhone = normalizePhone(phone);

  if(role === "master"){
    const storedMasterSlug =
      window.MASTER_SLUG ||
      window.localStorage.getItem("totem_master_slug") ||
      window.sessionStorage.getItem("totem_master_slug") ||
      "";

    if(storedMasterSlug){
      return `/master/${storedMasterSlug}`;
    }

    return "/";
  }

  const storedSalonSlug =
    window.SALON_SLUG ||
    window.localStorage.getItem("totem_salon_slug") ||
    window.sessionStorage.getItem("totem_salon_slug") ||
    "";

  if(storedSalonSlug){
    return `/salon/${storedSalonSlug}`;
  }

  if(normalizedPhone){
    return "/";
  }

  return "/";
}

export default function VerifyCodePage(){
  const navigate = useNavigate();
  const location = useLocation();

  const initialPhone = useMemo(() => {
    return normalizePhone(location.state?.phone || "");
  }, [location.state]);

  const initialRole = useMemo(() => {
    return String(location.state?.role || "salon_admin");
  }, [location.state]);

  const initialSalonSlug = useMemo(() => {
    return String(
      location.state?.salon_slug ||
      window.SALON_SLUG ||
      window.localStorage.getItem("totem_salon_slug") ||
      window.sessionStorage.getItem("totem_salon_slug") ||
      "totem-demo-salon"
    );
  }, [location.state]);

  const initialMasterSlug = useMemo(() => {
    return String(
      location.state?.master_slug ||
      window.MASTER_SLUG ||
      window.localStorage.getItem("totem_master_slug") ||
      window.sessionStorage.getItem("totem_master_slug") ||
      "totem-demo-master"
    );
  }, [location.state]);

  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [role] = useState(initialRole);
  const [salonSlug] = useState(initialSalonSlug);
  const [masterSlug] = useState(initialMasterSlug);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e){
    e.preventDefault();
    setLoading(true);
    setError("");

    try{
      const payload = {
        phone: normalizePhone(phone),
        code: String(code || "").trim(),
        purpose: "login_verify",
        channel: "whatsapp",
        role
      };

      if(role === "master"){
        payload.master_slug = masterSlug;
      }else{
        payload.salon_slug = salonSlug;
      }

      const res = await verifyAuth(payload);

      if(!res?.ok){
        setError("Неверный или просроченный код");
        setLoading(false);
        return;
      }

      const target = resolveRedirectTarget(res?.auth?.role || role, phone);
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
          Введите код, отправленный на WhatsApp.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "12px" }}>
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>Телефон</div>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+996556250974"
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
