// src/room/Settings.jsx
import { useEffect, useState } from "react";
import { fetchProfile, updateProfile } from "../api/profile";

const MASTER_ID = 1;

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchProfile(MASTER_ID);
      setProfile(data);
      setName(data.name);
    } catch (err) {
      console.error("PROFILE_LOAD_ERROR", err);
      setError("Ошибка загрузки профиля");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await updateProfile(MASTER_ID, { name });

      setSuccess(true);
    } catch (err) {
      console.error("PROFILE_UPDATE_ERROR", err);
      setError("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Настройки</h2>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>Сохранено</p>}

      {!loading && profile && (
        <div style={styles.card}>
          <div style={styles.field}>
            <label>Slug</label>
            <input value={profile.slug} disabled style={styles.input} />
          </div>

          <div style={styles.field}>
            <label>Имя мастера</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label>Статус</label>
            <input
              value={profile.active ? "Активен" : "Не активен"}
              disabled
              style={styles.input}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={styles.button}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    border: "1px solid #eee",
    padding: "16px",
    borderRadius: "8px",
    maxWidth: "400px",
  },
  field: {
    marginBottom: "12px",
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "6px",
  },
  button: {
    padding: "10px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};