import React from "react";
import ReactDOM from "react-dom/client";

const API_BASE = import.meta.env.VITE_API_BASE;

function App() {
  return (
    <div style={{ padding: "40px", fontFamily: "system-ui" }}>
      <h1>TOTEM SDK</h1>
      <div style={{ marginBottom: "20px", fontSize: "14px", opacity: 0.7 }}>
        API_BASE: {API_BASE}
      </div>

      <button
        onClick={async () => {
          try {
            const res = await fetch(`${API_BASE}/health`);
            const data = await res.json();
            alert(JSON.stringify(data));
          } catch (e) {
            alert("Error: " + e.message);
          }
        }}
      >
        Check API
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);