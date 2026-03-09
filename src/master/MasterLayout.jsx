import { Outlet, NavLink } from "react-router-dom"
import { useEffect } from "react"
import { MasterProvider } from "./MasterContext"

const ODOO_BASE = "https://www.totemv.com/odoo"

function getMasterSlug() {

  if (window.MASTER_SLUG) {
    return window.MASTER_SLUG
  }

  const parts = window.location.pathname.split("/")

  if (parts.length >= 3 && parts[1] === "master") {
    return parts[2]
  }

  return null
}

function getCurrentSection() {

  const hash = window.location.hash

  if (!hash) return "dashboard"

  const parts = hash.split("/")

  if (parts.length < 3) return "dashboard"

  return parts[2]
}

async function loadOdooPanel() {

  const slug = getMasterSlug()

  if (!slug) {
    console.error("ODOO BRIDGE: master slug missing")
    return
  }

  const section = getCurrentSection()

  const url = `${ODOO_BASE}/master/${slug}/${section}`

  try {

    const res = await fetch(url)

    if (!res.ok) {
      throw new Error("ODOO_FETCH_FAILED")
    }

    const html = await res.text()

    const container = document.getElementById("odoo-content")

    if (!container) {
      console.error("ODOO BRIDGE: container missing")
      return
    }

    container.innerHTML = html

  } catch (e) {

    console.error("ODOO BRIDGE ERROR", e)

  }

}

export default function MasterLayout() {

  const slug = getMasterSlug()

  useEffect(() => {

    loadOdooPanel()

    window.addEventListener("hashchange", loadOdooPanel)

    return () => {
      window.removeEventListener("hashchange", loadOdooPanel)
    }

  }, [])

  const menuStyle = ({ isActive }) => ({
    display: "block",
    padding: "6px 0",
    textDecoration: "none",
    color: isActive ? "#000" : "#444",
    fontWeight: isActive ? "600" : "400"
  })

  function logout() {
    window.location.href = "/"
  }

  return (

    <MasterProvider>

      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%"
      }}>

        {/* HEADER */}

        <div style={{
          height: "50px",
          borderBottom: "1px solid #eee",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          background: "#fafafa"
        }}>

          <div style={{
            fontWeight:"600",
            cursor:"pointer"
          }}
          onClick={()=>window.location.href="/"}
          >
            TOTEM
          </div>

          <div style={{
            display:"flex",
            alignItems:"center",
            gap:"20px"
          }}>

            <div style={{
              fontSize:"13px",
              color:"#555"
            }}>
              {slug}
            </div>

            <button
              onClick={logout}
              style={{
                border:"1px solid #ddd",
                background:"#fff",
                padding:"5px 10px",
                cursor:"pointer"
              }}
            >
              Выйти
            </button>

          </div>

        </div>

        {/* MAIN */}

        <div style={{
          display: "flex",
          flex: 1
        }}>

          {/* CABINET */}

          <div style={{
            width: "70%",
            borderRight: "1px solid #eee",
            display: "flex"
          }}>

            {/* SIDEBAR */}

            <div style={{
              width: "220px",
              borderRight: "1px solid #eee",
              padding: "20px",
              background: "#fafafa"
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

              {/* WORK */}

              <div style={{
                fontSize:"12px",
                color:"#888",
                marginBottom:"10px"
              }}>
                РАБОТА
              </div>

              <nav>

                <NavLink style={menuStyle} to="/master/dashboard">
                  Главная
                </NavLink>

                <NavLink style={menuStyle} to="/master/bookings">
                  Записи
                </NavLink>

                <NavLink style={menuStyle} to="/master/clients">
                  Клиенты
                </NavLink>

                <NavLink style={menuStyle} to="/master/schedule">
                  Расписание
                </NavLink>

              </nav>

              {/* FINANCE */}

              <div style={{
                fontSize:"12px",
                color:"#888",
                marginTop:"25px",
                marginBottom:"10px"
              }}>
                ФИНАНСЫ
              </div>

              <nav>

                <NavLink style={menuStyle} to="/master/money">
                  Доход
                </NavLink>

                <NavLink style={menuStyle} to="/master/transactions">
                  Транзакции
                </NavLink>

                <NavLink style={menuStyle} to="/master/settlements">
                  Сеты
                </NavLink>

                <NavLink style={menuStyle} to="/master/payouts">
                  Выплаты
                </NavLink>

              </nav>

              {/* SYSTEM */}

              <div style={{
                fontSize:"12px",
                color:"#888",
                marginTop:"25px",
                marginBottom:"10px"
              }}>
                СИСТЕМА
              </div>

              <nav>

                <NavLink style={menuStyle} to="/master/settings">
                  Настройки
                </NavLink>

              </nav>

            </div>

            {/* PAGE */}

            <div style={{
              flex: 1,
              overflow: "auto",
              padding: "20px"
            }}>

              <Outlet/>

            </div>

          </div>

          {/* ODOO */}

          <div
            id="odoo-content"
            style={{
              width: "30%",
              overflow: "auto",
              padding: "20px"
            }}
          />

        </div>

      </div>

    </MasterProvider>

  )
}