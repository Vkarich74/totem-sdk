import { useEffect, useState } from "react";

export default function OwnerMastersPage() {

  const [masters, setMasters] = useState([]);

  const slug = window.SALON_SLUG;

  async function loadMasters() {
    const r = await fetch(`/internal/salons/${slug}/masters`);
    const data = await r.json();
    setMasters(data);
  }

  useEffect(() => {
    loadMasters();
  }, []);

  async function activate(id) {
    await fetch(`/internal/salons/${slug}/masters/${id}/activate`, {
      method: "POST"
    });
    loadMasters();
  }

  async function fire(id) {
    await fetch(`/internal/salons/${slug}/masters/${id}/fire`, {
      method: "POST"
    });
    loadMasters();
  }

  return (
    <div>

      <h2>Мастера салона</h2>

      <table>

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

              <td>{m.name}</td>

              <td>{m.status}</td>

              <td>

                {m.status === "pending" && (
                  <button onClick={() => activate(m.id)}>
                    Активировать
                  </button>
                )}

                {m.status === "active" && (
                  <button onClick={() => fire(m.id)}>
                    Уволить
                  </button>
                )}

                {m.status === "fired" && (
                  <button onClick={() => activate(m.id)}>
                    Вернуть
                  </button>
                )}

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}