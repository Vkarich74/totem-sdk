import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { finishPasswordReset } from "../api/internal";

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

export default function ResetPasswordPage(){
  const navigate = useNavigate();
  const location = useLocation();

  const initialPhone = useMemo(() => {
    return normalizePhone(location.state?.phone || "");
  }, [location.state]);

  const [phone, setPhone] = useState(initialPhone);
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

    const normalizedPhone = normalizePhone(phone);
    const normalizedCode = String(code || "").trim();
    const normalizedPassword = String(password || "");
    const normalizedConfirm = String(confirmPassword || "");

    if(!normalizedPhone || !normalizedPhone.startsWith("+996")){
      setError("Введите телефон в формате +996XXXXXXXXX");
      return;
    }

    if(normalizedCode.length !== 6){
      setError("Введите 6-значный код");
      return;
    }

    if(normalizedPassword.length < 8){
      setError("Пароль должен быть не короче 8 символов");
      return;
    }

    if(normalizedPassword !== normalizedConfirm){
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);

    try{
      const result = await finishPasswordReset({
        phone: normalizedPhone,
        code: normalizedCode,
        password: normalizedPassword
      });

      if(!result?.ok){
        setError("Не удалось завершить сброс пароля");
        setLoading(false);
        return;
      }

      setSuccess("Пароль обновлён. Возвращаем на страницу входа.");

      navigate("/auth/login", { replace: true });
    }catch(e){
      setError("Ошибка сброса пароля");
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
        <h2 style={{ margin: "0 0 12px 0", fontSize: "24px" }}>Сброс пароля</h2>
        <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: "14px" }}>
          Введите код из WhatsApp и задайте новый пароль.
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

          <label style={{ display: "block", marginBottom: "12px" }}>
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>Новый пароль</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              placeholder="Минимум 8 символов"
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
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>Повторите пароль</div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
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
            {loading ? "Сохраняем..." : "Сбросить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
