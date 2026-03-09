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

        <div style={{
          width: "70%",
          borderRight: "1px solid #eee",
          display: "flex",
          minHeight: 0
        }}>

          {sidebar}

          <div style={{
            flex: 1,
            overflowX: "auto",
            overflowY: "auto",
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
          overflowY: "auto"
        }}>

          {odoo}

        </div>

      </div>

    </div>

  )

}