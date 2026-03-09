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
      minHeight: "100vh",
      width: "100%"
    }}>

      {header}

      <div style={{
        display: "flex",
        flex: 1,
        alignItems: "stretch"
      }}>

        {/* SIDEBAR */}

        <div style={{
          width: "260px",
          borderRight: "1px solid #eee",
          display: "flex",
          flexDirection: "column"
        }}>
          {sidebar}
        </div>

        {/* PAGE */}

        <div style={{
          flex: 1,
          padding: "20px"
        }}>
          {page}
        </div>

        {/* ODOO PANEL */}

        <div style={{
          width: "320px",
          borderLeft: "1px solid #eee"
        }}>
          {odoo}
        </div>

      </div>

    </div>

  )

}