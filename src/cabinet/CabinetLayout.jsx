export default function CabinetLayout({

  header,
  sidebar,
  page,
  odoo

}) {

  return (

    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100%",
      overflow: "hidden"
    }}>

      {header}

      <div style={{
        display: "flex",
        flex: 1,
        minHeight: 0
      }}>

        {/* SIDEBAR */}

        <div style={{
          width: "260px",
          borderRight: "1px solid #eee",
          display: "flex",
          flexDirection: "column",
          height: "100%"
        }}>
          {sidebar}
        </div>

        {/* PAGE */}

        <div style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflowX: "auto",
          overflowY: "auto",
          padding: "20px"
        }}>
          {page}
        </div>

        {/* ODOO PANEL */}

        <div style={{
          width: "320px",
          borderLeft: "1px solid #eee",
          overflowY: "auto",
          height: "100%"
        }}>
          {odoo}
        </div>

      </div>

    </div>

  )

}