import { Outlet } from "react-router-dom"

export default function CabinetLayout({

  header,
  sidebar,
  odooPanel

}) {

  return (

    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100%"
    }}>

      {header}

      <div style={{
        display: "flex",
        flex: 1
      }}>

        <div style={{
          width: "70%",
          borderRight: "1px solid #eee",
          display: "flex"
        }}>

          {sidebar}

          <div style={{
            flex: 1,
            overflow: "auto",
            padding: "20px"
          }}>

            <Outlet/>

          </div>

        </div>

        {odooPanel}

      </div>

    </div>

  )

}