import { NavLink } from "react-router-dom"

export default function MasterSidebar({ slug }) {

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

        <strong>Мастер</strong>

        <div style={{
          fontSize:"12px",
          color:"#777",
          marginTop:"4px"
        }}>
          {slug}
        </div>

      </div>

      <div style={{fontSize:"12px",color:"#888",marginBottom:"10px"}}>
        РАБОТА
      </div>

      <nav>

        <NavLink style={menuStyle} to="/master/dashboard">Главная</NavLink>
        <NavLink style={menuStyle} to="/master/bookings">Записи</NavLink>
        <NavLink style={menuStyle} to="/master/clients">Клиенты</NavLink>
        <NavLink style={menuStyle} to="/master/schedule">Расписание</NavLink>

      </nav>

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        ФИНАНСЫ
      </div>

      <nav>

        <NavLink style={menuStyle} to="/master/money">Доход</NavLink>
        <NavLink style={menuStyle} to="/master/transactions">Транзакции</NavLink>
        <NavLink style={menuStyle} to="/master/settlements">Сеты</NavLink>
        <NavLink style={menuStyle} to="/master/payouts">Выплаты</NavLink>

      </nav>

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        СИСТЕМА
      </div>

      <nav>

        <NavLink style={menuStyle} to="/master/settings">Настройки</NavLink>

      </nav>

    </div>

  )

}