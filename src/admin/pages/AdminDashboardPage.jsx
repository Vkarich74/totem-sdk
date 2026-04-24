import { useEffect, useState } from "react";
import AdminNavigation from "../AdminNavigation";

const API_BASE = (window.TOTEM_API_BASE || "https://api.totemv.com").replace(/\/$/, "");

export default function AdminDashboardPage(){
  const token = localStorage.getItem("TOTEM_AUTH_TOKEN");
  const [counts, setCounts] = useState({
    leads: 0,
    cases: 0,
    messages: 0,
  });
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let active = true;

    async function loadSummary(){
      if(!token){
        return;
      }

      setLoading(true);

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      try {
        const [leadsResponse, casesResponse, messagesResponse] = await Promise.all([
          fetch(`${API_BASE}/internal/admin/leads`, { headers }),
          fetch(`${API_BASE}/internal/admin/moderation`, { headers }),
          fetch(`${API_BASE}/internal/admin/messages`, { headers }),
        ]);

        const [leadsPayload, casesPayload, messagesPayload] = await Promise.all([
          leadsResponse.json(),
          casesResponse.json(),
          messagesResponse.json(),
        ]);

        if(!active){
          return;
        }

        setCounts({
          leads: Array.isArray(leadsPayload?.data?.items) ? leadsPayload.data.items.length : 0,
          cases: Array.isArray(casesPayload?.data?.items) ? casesPayload.data.items.length : 0,
          messages: Array.isArray(messagesPayload?.data?.items) ? messagesPayload.data.items.length : 0,
        });
      } finally {
        if(active){
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      active = false;
    };
  }, [token]);

  if(!token){
    return (
      <div style={{ padding: 24 }}>
        <p>Требуется вход администратора</p>
        <a href="#/admin/login?returnTo=/admin">Войти как администратор</a>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <AdminNavigation />

      <h1>Админ панель</h1>

      <h2>Сводка</h2>
      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <ul>
          <li>Лиды: {counts.leads}</li>
          <li>Кейсы: {counts.cases}</li>
          <li>Сообщения: {counts.messages}</li>
        </ul>
      )}

      <h2>Быстрые ссылки</h2>
      <ul>
        <li>
          <a href="#/admin/messages">Сообщения</a>
        </li>
        <li>
          <a href="#/admin/leads">Лиды</a>
        </li>
        <li>
          <a href="#/admin/cases">Кейсы</a>
        </li>
      </ul>

      <h2>Системный статус</h2>
      <ul>
        <li>WhatsApp: stub / отключен</li>
        <li>Providers: не подключены</li>
        <li>Admin control: active</li>
      </ul>
    </div>
  );
}
