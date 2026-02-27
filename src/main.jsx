import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{ padding: "40px", fontFamily: "system-ui" }}>
      <h1>TOTEM SDK</h1>
      <button
        onClick={async () => {
          try {
            const res = await fetch("https://api.totemv.com/health");
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