export default function AdminNavigation(){
  function navigate(hash){
    window.location.hash = hash;
    window.location.reload();
  }

  function handleLogout(){
    localStorage.removeItem("TOTEM_AUTH_TOKEN");
    window.location.hash = "#/admin/login";
    window.location.reload();
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button type="button" onClick={() => navigate("#/admin")}>
        Дешборд
      </button>
      <span> | </span>
      <button type="button" onClick={() => navigate("#/admin/messages")}>
        Сообщения
      </button>
      <span> | </span>
      <button type="button" onClick={() => navigate("#/admin/leads")}>
        Лиды
      </button>
      <span> | </span>
      <button type="button" onClick={() => navigate("#/admin/cases")}>
        Кейсы
      </button>
      <span> | </span>
      <button type="button" onClick={() => navigate("#/admin/clients")}>
        Клиенты
      </button>
      <span> | </span>
      <button type="button" onClick={() => navigate("#/admin/owners")}>
        Владельцы
      </button>
      <span> | </span>
      <button type="button" onClick={() => navigate("#/admin/open-owner")}>
        Открытие владельца
      </button>
      <span> | </span>
      <button type="button" onClick={() => navigate("#/admin/login")}>
        Логин
      </button>
      <span> | </span>
      <button type="button" onClick={handleLogout}>
        Выход
      </button>
    </div>
  )
}
