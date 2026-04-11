import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startPasswordReset } from "../api/internal";

function normalizePhone(value){
  const raw = String(value || "").trim();

  if(!raw){
    return "";
  }

  if(raw.startsWith("+996")){
    return raw;
  }

  const digits = raw.replace(/\D/g, "");

  if(digits.startsWith("996") && digits.length === 12){
    return `+${digits}`;
  }

  if(digits.length === 9){
    return `+996${digits}`;
  }

  return raw;
}

export default function ForgotPasswordPage(){
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e){
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalizedPhone = normalizePhone(phone);

    if(!normalizedPhone || !normalizedPhone.startsWith("+996")){
      setError("Введите телефон в формате +996XXXXXXXXX");
      return;
    }

    setLoading(true);

    try{
      const result = await startPasswordReset({
        phone: normalizedPhone,
        channel: "whatsapp"
      });

      if(!result?.ok){
        setError("Не удалось запустить восстановление");
        setLoading(false);
        return;
      }

      setSuccess("Код отправлен. Переходим к подтверждению.");

      navigate("/auth/reset", {
        replace: true,
        state: {
          phone: normalizedPhone
        }
      });
    }catch(e){
      setError("Ошибка запуска восстановления");
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
        <h2 style={{ margin: "0 0 12px 0", fontSize: "24px" }}>Восстановление пароля</h2>
        <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: "14px" }}>
          Введите телефон, и мы отправим код для сброса пароля.
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

          {error ? (
            <div style={{ color: "#b91c1c", marginBottom: "12px", fontSize: "14px" }}>
              {error}
            </div>
          ) : null}

          {success ? (
            <div style={{ color: "#065f46", marginBottom: "12px", fontSize: "14px" }}>
              {success}
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
            {loading ? "Отправляем..." : "Отправить код"}
          </button>
        </form>
      </div>
    </div>
  );
}
