import { useEffect, useState } from "react";

const API_BASE = "https://api.totemv.com";

export default function OwnerMastersPage() {

  const slug = window.SALON_SLUG;

  const [masters, setMasters] = useState([]);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");

  async function loadMasters() {
    const r = await fetch(`${API_BASE}/internal/salons/${slug}/masters`);
    const data = await r.json();
    setMasters(data);
  }

  useEffect(() => {
    loadMasters();
  }, []);

  function startEdit(m) {
    setEditing(m.id);
    setName(m.name);
  }

  async function save(id) {
    await fetch(`${API_BASE}/internal/masters/${id}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });

    setEditing(null);
    loadMasters();
  }

  async function fire(id) {
    await fetch(`${API_BASE}/internal/salons/${slug}/masters/${id}/fire`, {
      method: "POST"
    });

    loadMasters();
  }

  async function activate(id) {
    await fetch(`${API_BASE}/internal/salons/${slug}/masters/${id}/activate`, {
      method: "POST"
    });

    loadMasters();
  }

  return (
    <div>

      <h2>Мастера салона</h2>

      <table border="1" cellPadding="6">

        <thead>
          <tr>
            <th>ID</th>
            <th>Имя</th>
            <th>Статус</th>
            <th>Действие</th>
          </tr>
        </thead>

        <tbody>

          {masters.map(m => (

            <tr key={m.id}>

              <td>{m.id}</td>

              <td>

                {editing === m.id ? (

                  <input
                    value={name}
                    onChange={(e)=>setName(e.target.value)}
                  />

                ) : (

                  m.name

                )}

              </td>

              <td>{m.status}</td>

              <td>

                {editing === m.id ? (

                  <button onClick={()=>save(m.id)}>
                    Сохранить
                  </button>

                ) : (

                  <>
                    <button onClick={()=>startEdit(m)}>
                      Редактировать
                    </button>

                    {m.status === "active" && (
                      <button onClick={()=>fire(m.id)}>
                        Уволить
                      </button>
                    )}

                    {m.status === "fired" && (
                      <button onClick={()=>activate(m.id)}>
                        Вернуть
                      </button>
                    )}

                    {m.status === "pending" && (
                      <button onClick={()=>activate(m.id)}>
                        Активировать
                      </button>
                    )}

                  </>

                )}

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}