import { HashRouter, Routes, Route, useParams } from "react-router-dom";
import PublicSalonPage from "./public/PublicSalonPage";
import BookingPage from "./room/BookingPage";
import SalonBookingsPage from "./room/SalonBookingsPage";

function MasterRoom() {
  return <div style={{ padding: 20 }}>Master Room</div>;
}

function SalonRoom() {
  return <div style={{ padding: 20 }}>Salon Room</div>;
}

function SalonWrapper() {
  const { slug } = useParams();

  return (
    <Routes>
      <Route index element={<PublicSalonPage slug={slug} />} />
      <Route path="booking" element={<BookingPage slug={slug} />} />
      <Route path="bookings" element={<SalonBookingsPage slug={slug} />} />
      <Route path="room" element={<MasterRoom />} />
      <Route path="salon" element={<SalonRoom />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/salon/:slug/*" element={<SalonWrapper />} />
      </Routes>
    </HashRouter>
  );
}