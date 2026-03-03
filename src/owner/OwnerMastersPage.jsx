import { useEffect, useState } from "react";

const API = "https://api.totemv.com";

export default function OwnerMastersPage() {
  const slug = window.SALON_SLUG;

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function loadMasters(activeSlug) {
    const res = await fetch(`${API}/internal/salons/${activeSlug}/masters`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Ошибка загрузки мастеров");

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  useEffect(() => {
    if (!slug) {
      setPageError("SALON_SLUG not defined");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setPageError(null);
        const list = await loadMasters(slug);
        setMasters(list);
      } catch (e) {
        setPageError(e.message || "Ошибка");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  function startEdit(m) {
    setSaveError(null);
    setEditingId(m.id);
    setDraftName(m.name || "");
  }

  function cancelEdit() {
    setSaveError(null);
    setEditingId(null);
    setDraftName("");
  }

  async function saveName(masterId) {
    const name = (draftName || "").trim();

    if (name.length < 2) {
      setSaveError("Имя должно быть минимум 2 символа");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const res = await fetch(`${API}/internal/masters/${masterId}/profile`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error("Не удалось сохранить имя");
      }

      // Обновляем локально без перезагрузки списка
      setMasters((prev) =>
        prev.map((m) => (m.id === masterId ? { ...m, name } : m))
      );

      cancelEdit();
    } catch (e) {
      setSaveError(e.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Загрузка мастеров...</div>;

  if (pageError) return <div style={{ color: "red" }}>{pageError}</div>;

  if (masters.length === 0) return <div>Мастеров нет</div>;

  const card = {
    padding: 12,
    marginBottom: 10,
    border: "1px solid #eee",
    borderRadius: 8,
  };

  const row = { display: "flex", gap: 10, alignItems: "center" };

  const small = { fontSize: 12, color: "#666", marginTop: 6 };

  const btn = {
    padding: "8px 10px",
    cursor: "pointer",
  };

  const input = {
    padding: 8,
    width: "100%",
    maxWidth: 360,
  };

  return (
    <div>
      <h2>Мастера</h2>

      {masters.map((m) => {
        const isEditing = editingId === m.id;

        return (
          <div key={m.id} style={card}>
            {!isEditing ? (
              <>
                <div style={row}>
                  <strong style={{ flex: 1 }}>{m.name}</strong>

                  <button style={btn} onClick={() => startEdit(m)}>
                    Редактировать
                  </button>
                </div>

                <div style={small}>
                  Статус: {m.status} • Active: {String(!!m.active)}
                </div>
              </>
            ) : (
              <>
                <div style={row}>
                  <input
                    style={input}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    disabled={saving}
                    placeholder="Имя мастера"
                  />

                  <button style={btn} onClick={() => saveName(m.id)} disabled={saving}>
                    {saving ? "Сохранение..." : "Сохранить"}
                  </button>

                  <button style={btn} onClick={cancelEdit} disabled={saving}>
                    Отмена
                  </button>
                </div>

                {saveError ? (
                  <div style={{ color: "red", marginTop: 8 }}>{saveError}</div>
                ) : null}

                <div style={small}>
                  ID: {m.id} • slug: {m.master_slug}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}