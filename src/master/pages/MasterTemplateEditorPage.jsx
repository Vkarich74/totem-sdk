import { useState } from "react";

export default function MasterTemplateEditorPage() {
  const [state, setState] = useState({
    identity: {
      name: "",
      avatar: "",
      slug: ""
    },
    hero: {
      title: "",
      subtitle: "",
      image: ""
    },
    about: {
      text: ""
    }
  });

  function updateIdentity(field, value) {
    setState((prev) => ({
      ...prev,
      identity: {
        ...prev.identity,
        [field]: value
      }
    }));
  }

  function updateHero(field, value) {
    setState((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        [field]: value
      }
    }));
  }

  function updateAbout(value) {
    setState((prev) => ({
      ...prev,
      about: {
        ...prev.about,
        text: value
      }
    }));
  }

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>
        Редактор шаблона мастера
      </h1>

      <div style={{ marginTop: "24px", display: "grid", gap: "16px", maxWidth: "720px" }}>
        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px"
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>Идентификация</h2>

          <div style={{ display: "grid", gap: "12px" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span>Имя мастера</span>
              <input
                value={state.identity.name}
                onChange={(e) => updateIdentity("name", e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px" }}
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span>Avatar URL</span>
              <input
                value={state.identity.avatar}
                onChange={(e) => updateIdentity("avatar", e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px" }}
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span>Slug</span>
              <input
                value={state.identity.slug}
                onChange={(e) => updateIdentity("slug", e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px" }}
              />
            </label>
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px"
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>Hero</h2>

          <div style={{ display: "grid", gap: "12px" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span>Заголовок</span>
              <input
                value={state.hero.title}
                onChange={(e) => updateHero("title", e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px" }}
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span>Подзаголовок</span>
              <input
                value={state.hero.subtitle}
                onChange={(e) => updateHero("subtitle", e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px" }}
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span>Hero image URL</span>
              <input
                value={state.hero.image}
                onChange={(e) => updateHero("image", e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px" }}
              />
            </label>
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px"
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>О мастере</h2>

          <label style={{ display: "grid", gap: "6px" }}>
            <span>Текст</span>
            <textarea
              value={state.about.text}
              onChange={(e) => updateAbout(e.target.value)}
              rows={6}
              style={{
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                resize: "vertical"
              }}
            />
          </label>
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px"
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>Черновик состояния</h2>
          <pre
            style={{
              margin: 0,
              fontSize: "12px",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}
          >
            {JSON.stringify(state, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}