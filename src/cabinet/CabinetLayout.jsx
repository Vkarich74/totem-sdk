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
        minHeight: 0,
        overflow: "hidden"
      }}>

        <div style={{
          width: "70%",
          borderRight: "1px solid #eee",
          display: "flex",
          minHeight: 0,
          overflow: "hidden"
        }}>

          {sidebar}

          <div style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "20px",
            minHeight: 0,
            minWidth: 0
          }}>

            {page}

          </div>

        </div>

        <div style={{
          width: "30%",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden"
        }}>

          {odoo}

        </div>

      </div>

    </div>

  )

}