export default function AdminNavigation(){
  function handleLogout(){
    localStorage.removeItem("TOTEM_AUTH_TOKEN");
    window.location.assign("#/admin/login");
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <a href="#/admin/messages">Сообщения</a>
      <span> | </span>
      <a href="#/admin/leads">Лиды</a>
      <span> | </span>
      <a href="#/admin/cases">Кейсы</a>
      <span> | </span>
      <a href="#/admin/login">Логин</a>
      <span> | </span>
      <button type="button" onClick={handleLogout}>
        Выход
      </button>
    </div>
  )
}
