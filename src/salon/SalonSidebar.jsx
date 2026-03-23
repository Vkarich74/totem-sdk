import { NavLink } from "react-router-dom"

export default function SalonSidebar({ slug }) {

  const basePath = slug ? `/salon/${slug}` : "/salon";

  const menuStyle = ({ isActive }) => ({
    display: "block",
    padding: "6px 0",
    textDecoration: "none",
    color: isActive ? "#000" : "#444",
    fontWeight: isActive ? "600" : "400"
  })

  return (

    <div style={{
      width: "220px",
      flexShrink: 0,
      borderRight: "1px solid #eee",
      padding: "20px",
      background: "#fafafa",
      position: "sticky",
      top: 0,
      height: "100%",
      alignSelf: "flex-start"
    }}>

      <div style={{marginBottom:"25px"}}>

        <strong>Салон</strong>

        <div style={{
          fontSize:"12px",
          color:"#777",
          marginTop:"4px"
        }}>
          {slug}
        </div>

      </div>

      <div style={{fontSize:"12px",color:"#888",marginBottom:"10px"}}>
        Основное
      </div>

      <nav>
        <NavLink style={menuStyle} to={`${basePath}/dashboard`}>Dashboard</NavLink>
        <NavLink style={menuStyle} to={`${basePath}/calendar`}>Календарь</NavLink>
        <NavLink style={menuStyle} to={`${basePath}/masters`}>Мастера</NavLink>
        <NavLink style={menuStyle} to={`${basePath}/clients`}>Клиенты</NavLink>
        <NavLink style={menuStyle} to={`${basePath}/bookings`}>Записи</NavLink>

        {/* ДОБАВЛЕНО — УСЛУГИ */}
        <NavLink style={menuStyle} to={`${basePath}/services`}>Услуги</NavLink>

      </nav>

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        Финансы
      </div>

      <nav>
        <NavLink style={menuStyle} to={`${basePath}/finance`}>Финансы</NavLink>

        {/* ДОБАВЛЕНО — КОНТРАКТЫ */}
        <NavLink style={menuStyle} to={`${basePath}/contracts`}>Контракты</NavLink>

        <NavLink style={menuStyle} to={`${basePath}/money`}>Деньги</NavLink>
        <NavLink style={menuStyle} to={`${basePath}/salon-money`}>Финансы салона</NavLink>
        <NavLink style={menuStyle} to={`${basePath}/transactions`}>Транзакции</NavLink>
        <NavLink style={menuStyle} to={`${basePath}/settlements`}>Сеты</NavLink>
        <NavLink style={menuStyle} to={`${basePath}/payouts`}>Выплаты</NavLink>
      </nav>

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        Аккаунт
      </div>

      <nav>
        <NavLink style={menuStyle} to={`${basePath}/settings`}>Настройки</NavLink>
      </nav>

    </div>

  )

}
