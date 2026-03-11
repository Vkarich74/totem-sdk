import { NavLink } from "react-router-dom"

export default function SalonSidebar({ slug }) {

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
        <NavLink style={menuStyle} to="/salon/dashboard">Dashboard</NavLink>
        <NavLink style={menuStyle} to="/salon/calendar">Календарь</NavLink>
        <NavLink style={menuStyle} to="/salon/masters">Мастера</NavLink>
        <NavLink style={menuStyle} to="/salon/clients">Клиенты</NavLink>
        <NavLink style={menuStyle} to="/salon/bookings">Записи</NavLink>
      </nav>

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        Финансы
      </div>

      <nav>
        <NavLink style={menuStyle} to="/salon/finance">Финансы</NavLink>
        <NavLink style={menuStyle} to="/salon/money">Деньги</NavLink>
        <NavLink style={menuStyle} to="/salon/salon-money">Финансы салона</NavLink>
        <NavLink style={menuStyle} to="/salon/transactions">Транзакции</NavLink>
        <NavLink style={menuStyle} to="/salon/settlements">Сеты</NavLink>
        <NavLink style={menuStyle} to="/salon/payouts">Выплаты</NavLink>
      </nav>

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        Аккаунт
      </div>

      <nav>
        <NavLink style={menuStyle} to="/salon/settings">Настройки</NavLink>
      </nav>

    </div>

  )

}