import { useEffect, useState } from "react";

const API_BASE = "https://api.totemv.com";

export default function OwnerMastersPage() {

  const slug = window.SALON_SLUG;

  const [masters, setMasters] = useState([]);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");

  async function loadMasters() {

    try {

      const r = await fetch(`${API_BASE}/internal/salons/${slug}/masters`);
      const data = await r.json();

      setMasters(data);

    } catch (e) {

      console.error("LOAD_MASTERS_ERROR", e);

    }

  }

  useEffect(() => {

    loadMasters();

  }, []);

  function startEdit(master) {

    setEditing(master.id);
    setName(master.name);

  }

  async function save(id) {

    await fetch(`${API_BASE}/internal/masters/${id}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name
      })
    });

    setEditing(null);

    loadMasters();

  }

  async function fire(id) {

    await fetch(`${API_BASE}/internal/masters/fire`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        master_id: id,
        salon_slug: slug
      })
    });

    loadMasters();

  }

  async function activate(id) {

    await fetch(`${API_BASE}/internal/masters/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        master_id: id,
        salon_slug: slug
      })
    });

    loadMasters();

  }

  async function createMaster() {

    const masterName = prompt("Имя мастера");

    if (!masterName) return;

    await fetch(`${API_BASE}/internal/masters/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: masterName,
        salon_slug: slug
      })
    });

    loadMasters();

  }

  return (
    <div>

      <h2>Мастера салона</h2>

      <button
        style={{ marginBottom: 20 }}
        onClick={createMaster}
      >
        Пригласить мастера
      </button>

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

          {masters.map((m) => (

            <tr key={m.id}>

              <td>{m.id}</td>

              <td>

                {editing === m.id ? (

                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                ) : (

                  m.name

                )}

              </td>

              <td>{m.status}</td>

              <td>

                {editing === m.id ? (

                  <button onClick={() => save(m.id)}>
                    Сохранить
                  </button>

                ) : (

                  <>

                    <button
                      style={{ marginRight: 10 }}
                      onClick={() => startEdit(m)}
                    >
                      Редактировать
                    </button>

                    {m.status === "pending" && (
                      <button
                        style={{ marginRight: 10 }}
                        onClick={() => activate(m.id)}
                      >
                        Активировать
                      </button>
                    )}

                    {m.status === "active" && (
                      <button
                        style={{ marginRight: 10 }}
                        onClick={() => fire(m.id)}
                      >
                        Уволить
                      </button>
                    )}

                    {m.status === "fired" && (
                      <button
                        style={{ marginRight: 10 }}
                        onClick={() => activate(m.id)}
                      >
                        Вернуть
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