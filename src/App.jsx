import { HashRouter, Routes, Route } from "react-router-dom";
import PublicSalonPage from "./public/PublicSalonPage";
import BookingPage from "./room/BookingPage";
import SalonBookingsPage from "./room/SalonBookingsPage";
import OwnerDashboard from "./owner/OwnerDashboard";

function getSlugFromPath() {
  const parts = window.location.pathname.split("/");
  return parts[2] || null; // /salon/:slug
}

function MasterRoom() {
  return <div style={{ padding: 20 }}>Master Room</div>;
}

function SalonRoom() {
  return <div style={{ padding: 20 }}>Salon Room</div>;
}

export default function App() {
  const slug = getSlugFromPath();

  return (
    <HashRouter>
      <Routes>
        {/* PUBLIC */}
        <Route index element={<PublicSalonPage slug={slug} />} />
        <Route path="booking" element={<BookingPage slug={slug} />} />
        <Route path="bookings" element={<SalonBookingsPage slug={slug} />} />

        {/* OWNER */}
        <Route path="owner" element={<OwnerDashboard slug={slug} />} />

        {/* PLACEHOLDER */}
        <Route path="room" element={<MasterRoom />} />
        <Route path="salon" element={<SalonRoom />} />
      </Routes>
    </HashRouter>
  );
}