import { NavLink } from "react-router-dom"

export default function MasterSidebar({ slug }) {

  const base = `/master/${slug}`

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

        <strong>Кабинет</strong>

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

        <NavLink style={menuStyle} to={`${base}/dashboard`}>Главная</NavLink>
        <NavLink style={menuStyle} to={`${base}/bookings`}>Записи</NavLink>
        <NavLink style={menuStyle} to={`${base}/clients`}>Клиенты</NavLink>
        <NavLink style={menuStyle} to={`${base}/schedule`}>Расписание</NavLink>
        <NavLink style={menuStyle} to={`${base}/services`}>Услуги</NavLink>

      </nav>

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        Финансы
      </div>

      <nav>

        <NavLink style={menuStyle} to={`${base}/finance`}>Финансы</NavLink>
        <NavLink style={menuStyle} to={`${base}/money`}>Доход</NavLink>
        <NavLink style={menuStyle} to={`${base}/transactions`}>Транзакции</NavLink>
        <NavLink style={menuStyle} to={`${base}/settlements`}>Сеты</NavLink>
        <NavLink style={menuStyle} to={`${base}/payouts`}>Выплаты</NavLink>

      </nav>

      <div style={{fontSize:"12px",color:"#888",marginTop:"25px",marginBottom:"10px"}}>
        Аккаунт
      </div>

      <nav>

        <NavLink style={menuStyle} to={`${base}/settings`}>Настройки</NavLink>

      </nav>

    </div>

  )

}