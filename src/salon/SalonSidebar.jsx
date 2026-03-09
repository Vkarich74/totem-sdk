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
      overflowY: "auto",
      minHeight: 0
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

      {/* WORK */}

      <div style={{fontSize:"12px",color:"#888",marginBottom:"10px"}}>
        РАБОТА
      </div>

      <nav>

        <NavLink style={menuStyle} to="/salon/dashboard">Dashboard</NavLink>
        <NavLink style={menuStyle} to="/salon/calendar">Календарь</NavLink>
        <NavLink style={menuStyle} to="/salon/masters">Мастера</NavLink>
        <NavLink style={menuStyle} to="/salon/clients">Клиенты</NavLink>
        <NavLink style={menuStyle} to="/salon/bookings">Записи</NavLink>

      </nav>

      {/* FINANCE */}

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        ФИНАНСЫ
      </div>

      <nav>

        <NavLink style={menuStyle} to="/salon/money">Деньги</NavLink>
        <NavLink style={menuStyle} to="/salon/finance">Финансы салона</NavLink>
        <NavLink style={menuStyle} to="/salon/transactions">Транзакции</NavLink>
        <NavLink style={menuStyle} to="/salon/settlements">Сеты</NavLink>
        <NavLink style={menuStyle} to="/salon/payouts">Выплаты</NavLink>

      </nav>

      {/* SYSTEM */}

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        СИСТЕМА
      </div>

      <nav>

        <NavLink style={menuStyle} to="/salon/settings">Настройки</NavLink>

      </nav>

    </div>

  )

}