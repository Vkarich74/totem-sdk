import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { startPasswordReset } from "../api/internal";

function normalizeEmail(value){
  return String(value || "").trim().toLowerCase();
}

export default function ForgotPasswordPage(){
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const role = String(query.get("role") || "").trim().toLowerCase();
  const slug = String(query.get("slug") || "").trim().toLowerCase();
  const initialLogin = String(query.get("login") || "").trim();

  const [email, setEmail] = useState(initialLogin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e){
    e.preventDefault();
    setError("");
    setSuccess("");

    if(!role || !slug){
      setError("Ошибка контекста входа");
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    if(!normalizedEmail || !normalizedEmail.includes("@")){
      setError("Введите email");
      return;
    }

    setLoading(true);

    try{
      const payload = {
        login: normalizedEmail,
        email: normalizedEmail,
        role,
        slug,
        owner_slug: slug,
        channel: "email"
      };

      if(role === "salon_admin"){
        payload.salon_slug = slug;
      }

      if(role === "master"){
        payload.master_slug = slug;
      }

      const result = await startPasswordReset({
        ...payload
      });

      if(!result?.ok){
        setError("Не удалось запустить восстановление");
        setLoading(false);
        return;
      }

      if(result?.neutral === true){
        setError("Пользователь с таким email и кабинетом не найден. Проверьте роль и салон/мастера.");
        setLoading(false);
        return;
      }

      setSuccess("Код отправлен. Переходим к подтверждению.");

      navigate(
        `/auth/reset?role=${encodeURIComponent(role)}&slug=${encodeURIComponent(slug)}&login=${encodeURIComponent(normalizedEmail)}`,
        { replace: true }
      );
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
          Введите email, и мы отправим код для сброса пароля.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "12px" }}>
            <div style={{ marginBottom: "6px", fontSize: "14px" }}>Email</div>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
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
