export default function CabinetHeader({ slug, onLogout }) {

  return (

    <div style={{
      height: "50px",
      borderBottom: "1px solid #eee",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      background: "#fafafa",
      flexShrink: 0
    }}>

      <div
        style={{
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
          onClick={onLogout}
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

  )

}