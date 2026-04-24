import AdminNavigation from "../AdminNavigation";

export default function AdminDashboardPage(){
  const token = localStorage.getItem("TOTEM_AUTH_TOKEN");

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
