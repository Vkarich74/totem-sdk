import { HashRouter, Routes, Route } from "react-router-dom";

import ErrorBoundary from "./core/ErrorBoundary";

import PublicSalonPage from "./public/PublicSalonPage";
import BookingPage from "./room/BookingPage";
import SalonBookingsPage from "./room/SalonBookingsPage";

import OwnerLayout from "./owner_backup/OwnerLayout";

/* SALON PAGES */
import DashboardPage from "./salon/pages/DashboardPage";
import MastersPage from "./salon/pages/MastersPage";
import ClientsPage from "./salon/pages/ClientsPage";
import BookingsPage from "./salon/pages/BookingsPage";
import CalendarPage from "./salon/pages/CalendarPage";
import MoneyPage from "./salon/pages/MoneyPage";
import SettingsPage from "./salon/pages/SettingsPage";

/* SALON FINANCE */
import SalonMoneyPage from "./salon/payments/SalonMoneyPage";
import SalonTransactionsPage from "./salon/payments/SalonTransactionsPage";
import SalonSettlementsPage from "./salon/payments/SalonSettlementsPage";
import SalonPayoutsPage from "./salon/payments/SalonPayoutsPage";

/* NEW SALON FINANCE CONTROL PAGE */
import SalonFinancePage from "./salon/payments/SalonFinancePage";

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

/* NEW MASTER FINANCE CONTROL PAGE */
import MasterFinancePage from "./master/payments/MasterFinancePage";

function getSlugFromPath() {
  const parts = window.location.pathname.split("/");
  return parts[2] || null;
}

export default function App() {
  const slug = getSlugFromPath();

  return (

    <ErrorBoundary>

      <HashRouter>

        <Routes>

          {/* PUBLIC */}
          <Route index element={<PublicSalonPage slug={slug} />} />
          <Route path="booking" element={<BookingPage slug={slug} />} />
          <Route path="bookings" element={<SalonBookingsPage slug={slug} />} />

          {/* SALON CABINET */}
          <Route path="salon" element={<OwnerLayout slug={slug} />}>

            <Route index element={<DashboardPage slug={slug} />} />
            <Route path="dashboard" element={<DashboardPage slug={slug} />} />

            <Route path="calendar" element={<CalendarPage slug={slug} />} />

            <Route path="masters" element={<MastersPage slug={slug} />} />

            <Route path="clients" element={<ClientsPage slug={slug} />} />

            <Route path="bookings" element={<BookingsPage slug={slug} />} />

            <Route path="money" element={<MoneyPage />} />

            {/* SALON FINANCE CONTROL */}
            <Route path="finance" element={<SalonFinancePage />} />

            {/* SALON FINANCE */}
            <Route path="salon-money" element={<SalonMoneyPage />} />
            <Route path="transactions" element={<SalonTransactionsPage />} />
            <Route path="settlements" element={<SalonSettlementsPage />} />
            <Route path="payouts" element={<SalonPayoutsPage />} />

            <Route path="settings" element={<SettingsPage />} />

          </Route>

          {/* MASTER */}
          <Route path="master" element={<MasterLayout />}>

            <Route index element={<MasterDashboard />} />
            <Route path="dashboard" element={<MasterDashboard />} />

            <Route path="bookings" element={<MasterBookingsPage />} />
            <Route path="bookings/:bookingId" element={<MasterBookingsPage />} />

            <Route path="clients" element={<MasterClientsPage />} />

            <Route path="schedule" element={<MasterSchedulePage />} />

            {/* MASTER FINANCE CONTROL */}
            <Route path="finance" element={<MasterFinancePage />} />

            {/* MASTER FINANCE */}
            <Route path="money" element={<MasterMoneyPage />} />
            <Route path="transactions" element={<MasterTransactionsPage />} />
            <Route path="settlements" element={<MasterSettlementsPage />} />
            <Route path="payouts" element={<MasterPayoutsPage />} />

            <Route path="settings" element={<MasterSettingsPage />} />

          </Route>

        </Routes>

      </HashRouter>

    </ErrorBoundary>

  );
}