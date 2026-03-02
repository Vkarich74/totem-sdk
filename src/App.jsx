import { BrowserRouter, Routes, Route } from "react-router-dom";

import PublicSalonPage from "./public/PublicSalonPage";
import BookingPage from "./room/BookingPage";
import SalonBookingsPage from "./room/SalonBookingsPage";

function MasterRoom() {
  return <div style={{ padding: 20 }}>Master Room</div>;
}

function SalonRoom() {
  return <div style={{ padding: 20 }}>Salon Room</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div style={{ padding: 20 }}>TOTEM SDK</div>} />

        <Route path="/room/book" element={<BookingPage />} />
        <Route path="/room/bookings" element={<SalonBookingsPage />} />
        <Route path="/room" element={<MasterRoom />} />

        <Route path="/salon/:slug" element={<PublicSalonPage />} />
        <Route path="/salon" element={<SalonRoom />} />
      </Routes>
    </BrowserRouter>
  );
}