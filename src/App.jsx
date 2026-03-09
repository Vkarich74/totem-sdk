import { HashRouter, Routes, Route } from "react-router-dom";

import PublicSalonPage from "./public/PublicSalonPage";
import BookingPage from "./room/BookingPage";
import SalonBookingsPage from "./room/SalonBookingsPage";

import OwnerLayout from "./owner/OwnerLayout";
import OwnerDashboard from "./owner/OwnerDashboard";
import OwnerMastersPage from "./owner/OwnerMastersPage";
import OwnerClientsPage from "./owner/OwnerClientsPage";
import OwnerBookingsPage from "./owner/OwnerBookingsPage";
import OwnerCalendarPage from "./owner/OwnerCalendarPage";
import OwnerClientProfilePage from "./owner/OwnerClientProfilePage";
import OwnerMoneyPage from "./owner/OwnerMoneyPage";
import OwnerSettingsPage from "./owner/OwnerSettingsPage";

/* SALON FINANCE */
import SalonMoneyPage from "./salon/payments/SalonMoneyPage";
import SalonTransactionsPage from "./salon/payments/SalonTransactionsPage";
import SalonSettlementsPage from "./salon/payments/SalonSettlementsPage";
import SalonPayoutsPage from "./salon/payments/SalonPayoutsPage";

/* MASTER */
import MasterLayout from "./master/MasterLayout";
import MasterDashboard from "./master/MasterDashboard";
import MasterBookingsPage from "./master/MasterBookingsPage";
import MasterClientsPage from "./master/MasterClientsPage";
import MasterSchedulePage from "./master/MasterSchedulePage";
import MasterSettingsPage from "./master/MasterSettingsPage";

/* MASTER FINANCE */
import MasterMoneyPage from "./master/payments/MasterMoneyPage";
import MasterTransactionsPage from "./master/payments/MasterTransactionsPage";
import MasterSettlementsPage from "./master/payments/MasterSettlementsPage";
import MasterPayoutsPage from "./master/payments/MasterPayoutsPage";

function getSlugFromPath() {
  const parts = window.location.pathname.split("/");
  return parts[2] || null;
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

        {/* SALON CABINET */}
        <Route path="salon" element={<OwnerLayout slug={slug} />}>

          <Route index element={<OwnerDashboard slug={slug} />} />

          <Route path="dashboard" element={<OwnerDashboard slug={slug} />} />

          <Route path="calendar" element={<OwnerCalendarPage slug={slug} />} />

          <Route path="masters" element={<OwnerMastersPage slug={slug} />} />

          <Route path="clients" element={<OwnerClientsPage slug={slug} />} />

          <Route path="bookings" element={<OwnerBookingsPage slug={slug} />} />

          <Route path="client/:clientId" element={<OwnerClientProfilePage />} />

          <Route path="money" element={<OwnerMoneyPage />} />

          {/* SALON FINANCE */}
          <Route path="salon-money" element={<SalonMoneyPage />} />
          <Route path="transactions" element={<SalonTransactionsPage />} />
          <Route path="settlements" element={<SalonSettlementsPage />} />
          <Route path="payouts" element={<SalonPayoutsPage />} />

          <Route path="settings" element={<OwnerSettingsPage />} />

        </Route>

        {/* MASTER */}
        <Route path="master" element={<MasterLayout />}>

          <Route index element={<MasterDashboard />} />

          <Route path="dashboard" element={<MasterDashboard />} />

          <Route path="bookings" element={<MasterBookingsPage />} />
          <Route path="bookings/:bookingId" element={<MasterBookingsPage />} />

          <Route path="clients" element={<MasterClientsPage />} />

          <Route path="schedule" element={<MasterSchedulePage />} />

          {/* MASTER FINANCE */}
          <Route path="money" element={<MasterMoneyPage />} />
          <Route path="transactions" element={<MasterTransactionsPage />} />
          <Route path="settlements" element={<MasterSettlementsPage />} />
          <Route path="payouts" element={<MasterPayoutsPage />} />

          <Route path="settings" element={<MasterSettingsPage />} />

        </Route>

      </Routes>
    </HashRouter>
  );
}