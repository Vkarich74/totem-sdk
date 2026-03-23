import { NavLink } from "react-router-dom"

export default function SalonSidebar({ slug }) {

  const baseSalonPath = slug ? `/salon/${slug}` : "/salon"

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
        <NavLink style={menuStyle} to={`${baseSalonPath}/dashboard`}>Dashboard</NavLink>
        <NavLink style={menuStyle} to={`${baseSalonPath}/calendar`}>Календарь</NavLink>
        <NavLink style={menuStyle} to={`${baseSalonPath}/masters`}>Мастера</NavLink>
        <NavLink style={menuStyle} to={`${baseSalonPath}/clients`}>Клиенты</NavLink>
        <NavLink style={menuStyle} to={`${baseSalonPath}/bookings`}>Записи</NavLink>

        {/* ДОБАВЛЕНО — УСЛУГИ */}
        <NavLink style={menuStyle} to={`${baseSalonPath}/services`}>Услуги</NavLink>

      </nav>

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        Финансы
      </div>

      <nav>
        <NavLink style={menuStyle} to={`${baseSalonPath}/finance`}>Финансы</NavLink>

        {/* ДОБАВЛЕНО — КОНТРАКТЫ */}
        <NavLink style={menuStyle} to={`${baseSalonPath}/contracts`}>Контракты</NavLink>

        <NavLink style={menuStyle} to={`${baseSalonPath}/money`}>Деньги</NavLink>
        <NavLink style={menuStyle} to={`${baseSalonPath}/salon-money`}>Финансы салона</NavLink>
        <NavLink style={menuStyle} to={`${baseSalonPath}/transactions`}>Транзакции</NavLink>
        <NavLink style={menuStyle} to={`${baseSalonPath}/settlements`}>Сеты</NavLink>
        <NavLink style={menuStyle} to={`${baseSalonPath}/payouts`}>Выплаты</NavLink>
      </nav>

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        Аккаунт
      </div>

      <nav>
        <NavLink style={menuStyle} to={`${baseSalonPath}/settings`}>Настройки</NavLink>
      </nav>

    </div>

  )

}
