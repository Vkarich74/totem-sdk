import { HashRouter, Routes, Route } from "react-router-dom";
import PublicSalonPage from "./public/PublicSalonPage";
import BookingPage from "./room/BookingPage";
import SalonBookingsPage from "./room/SalonBookingsPage";

function MasterRoom() {
  return <div style={{ padding: 20 }}>Master Room</div>;
}

function SalonRoom() {
  return <div style={{ padding: 20 }}>Salon Room</div>;
}

export default function App({ slug }) {
  return (
    <HashRouter>
      <Routes>
        <Route index element={<PublicSalonPage slug={slug} />} />

        <Route path="booking" element={<BookingPage slug={slug} />} />
        <Route path="bookings" element={<SalonBookingsPage slug={slug} />} />

        <Route path="room" element={<MasterRoom />} />
        <Route path="salon" element={<SalonRoom />} />
      </Routes>
    </HashRouter>
  );
}