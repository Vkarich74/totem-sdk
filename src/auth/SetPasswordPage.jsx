import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setPassword, resolveSession } from "../api/internal";

function resolveRedirectTarget(session){
  const role = String(session?.identity?.role || session?.auth?.role || session?.role || "");

  if(role === "master"){
    const masterSlug =
      session?.identity?.master_slug ||
      window.MASTER_SLUG ||
      window.localStorage.getItem("totem_master_slug") ||
      window.sessionStorage.getItem("totem_master_slug") ||
      "";

    if(masterSlug){
      return `/master/${masterSlug}`;
    }

    return "/";
  }

  const salonSlug =
    session?.identity?.salon_slug ||
    window.SALON_SLUG ||
    window.localStorage.getItem("totem_salon_slug") ||
    window.sessionStorage.getItem("totem_salon_slug") ||
    "";

  if(salonSlug){
    return `/salon/${salonSlug}`;
  }

  return "/";
}

export default function SetPasswordPage(){
  const navigate = useNavigate();

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
      setError("Пароль должен быть не короче 8 символов");
      return;
    }

    if(normalizedPassword !== String(confirmPassword || "")){
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);

    try{
      const saveResult = await setPassword({ password: normalizedPassword });

      if(!saveResult?.ok){
        setError("Не удалось сохранить пароль");
        setLoading(false);
        return;
      }

      setSuccess("Пароль сохранён. Проверяем сессию…");

      const session = await resolveSession();

      if(session?.ok && session?.authenticated){
        navigate(resolveRedirectTarget(session), { replace: true });
        return;
      }

      navigate("/", { replace: true });
    }catch(e){
      setError("Ошибка сохранения пароля");
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
        <h2 style={{ margin: "0 0 12px 0", fontSize: "24px" }}>Создание пароля</h2>
        <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: "14px" }}>
          Задайте постоянный пароль для входа в кабинет.
        </p>

        <form onSubmit={handleSubmit}>
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
            {loading ? "Сохраняем..." : "Сохранить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
