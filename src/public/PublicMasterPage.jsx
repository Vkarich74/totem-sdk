export default function PublicMasterPage({ slug }) {
  return (
    <div style={{
      padding: "40px",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        MASTER PUBLIC PAGE
      </h1>

      <div style={{
        padding: "20px",
        background: "#f5f5f5",
        borderRadius: "12px",
        marginBottom: "20px"
      }}>
        <strong>Slug:</strong> {slug || "NO SLUG"}
      </div>

      <div style={{
        padding: "20px",
        background: "#e6f7ff",
        borderRadius: "12px"
      }}>
        ✅ Page connected successfully
      </div>
    </div>
  );
}