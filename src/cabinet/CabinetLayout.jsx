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
        minWidth: 0,
        overflow: "hidden"
      }}>

        <div style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden"
        }}>

          {sidebar}

          <div style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "20px"
          }}>

            {page}

          </div>

        </div>

        {odoo && (

          <div style={{
            width: "320px",
            flexShrink: 0,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            borderLeft: "1px solid #eee"
          }}>

            {odoo}

          </div>

        )}

      </div>

    </div>

  )

}