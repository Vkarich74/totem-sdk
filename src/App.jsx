import { HashRouter, Routes, Route } from "react-router-dom";

import ErrorBoundary from "./core/ErrorBoundary";

import PublicSalonPage from "./public/PublicSalonPage";
import PublicMasterPage from "./public/PublicMasterPage";

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
import ServicesPage from "./salon/pages/ServicesPage";

/* SALON FINANCE */
import SalonMoneyPage from "./salon/payments/SalonMoneyPage";
import SalonTransactionsPage from "./salon/payments/SalonTransactionsPage";
import SalonSettlementsPage from "./salon/payments/SalonSettlementsPage";
import SalonPayoutsPage from "./salon/payments/SalonPayoutsPage";

/* NEW SALON FINANCE CONTROL PAGE */
import SalonFinancePage from "./salon/payments/SalonFinancePage";
import SalonContractsPage from "./salon/contracts/SalonContractsPage";

/* MASTER */
import MasterLayout from "./master/MasterLayout";
import MasterDashboard from "./master/MasterDashboard";
import MasterBookingsPage from "./master/MasterBookingsPage";
import MasterClientsPage from "./master/MasterClientsPage";
import MasterSchedulePage from "./master/MasterSchedulePage";
import MasterSettingsPage from "./master/MasterSettingsPage";
import MasterServicesPage from "./master/MasterServicesPage";

/* MASTER FINANCE */
import MasterMoneyPage from "./master/payments/MasterMoneyPage";
import MasterTransactionsPage from "./master/payments/MasterTransactionsPage";
import MasterSettlementsPage from "./master/payments/MasterSettlementsPage";
import MasterPayoutsPage from "./master/payments/MasterPayoutsPage";

/* NEW MASTER FINANCE CONTROL PAGE */
import MasterFinancePage from "./master/payments/MasterFinancePage";

function getSlugFromPath() {
  const hash = window.location.hash || "";
  const clean = hash.replace(/^#\/?/, "");
  const parts = clean.split("/");

  const globalSalonSlug = window.SALON_SLUG || null;
  const globalMasterSlug = window.MASTER_SLUG || null;

  return parts[1] || globalSalonSlug || globalMasterSlug;
}

function getPublicPage() {
  const path = window.location.pathname || "";

  if (path.startsWith("/master")) {
    return "master";
  }

  if (path.startsWith("/salon")) {
    return "salon";
  }

  return "salon";
}

export default function App() {
  const slug = getSlugFromPath();
  const publicType = getPublicPage();

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>

          {/* PUBLIC ROOT */}
          <Route
            index
            element={
              publicType === "master" ? (
                <PublicMasterPage slug={slug} />
              ) : (
                <PublicSalonPage slug={slug} />
              )
            }
          />

          <Route path="booking" element={<BookingPage slug={slug} />} />
          <Route path="bookings" element={<SalonBookingsPage slug={slug} />} />

          {/* SALON CABINET */}
          <Route path="salon" element={<OwnerLayout />}>

            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="calendar" element={<CalendarPage />} />
            <Route path="masters" element={<MastersPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="services" element={<ServicesPage />} />

            <Route path="money" element={<MoneyPage />} />

            {/* SALON FINANCE CONTROL */}
            <Route path="finance" element={<SalonFinancePage />} />
            <Route path="contracts" element={<SalonContractsPage />} />

            {/* SALON FINANCE */}
            <Route path="salon-money" element={<SalonMoneyPage />} />
            <Route path="transactions" element={<SalonTransactionsPage />} />
            <Route path="settlements" element={<SalonSettlementsPage />} />
            <Route path="payouts" element={<SalonPayoutsPage />} />

            <Route path="settings" element={<SettingsPage />} />

          </Route>

          {/* SALON CABINET WITH SLUG */}
          <Route path="salon/:slug" element={<OwnerLayout />}>

            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="calendar" element={<CalendarPage />} />
            <Route path="masters" element={<MastersPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="services" element={<ServicesPage />} />

            <Route path="money" element={<MoneyPage />} />

            {/* SALON FINANCE CONTROL */}
            <Route path="finance" element={<SalonFinancePage />} />
            <Route path="contracts" element={<SalonContractsPage />} />

            {/* SALON FINANCE */}
            <Route path="salon-money" element={<SalonMoneyPage />} />
            <Route path="transactions" element={<SalonTransactionsPage />} />
            <Route path="settlements" element={<SalonSettlementsPage />} />
            <Route path="payouts" element={<SalonPayoutsPage />} />

            <Route path="settings" element={<SettingsPage />} />

          </Route>

          {/* MASTER CABINET */}
          <Route path="master" element={<MasterLayout />}>

            <Route index element={<MasterDashboard />} />
            <Route path="dashboard" element={<MasterDashboard />} />

            <Route path="bookings" element={<MasterBookingsPage />} />
            <Route path="bookings/:bookingId" element={<MasterBookingsPage />} />

            <Route path="clients" element={<MasterClientsPage />} />

            <Route path="schedule" element={<MasterSchedulePage />} />
            <Route path="services" element={<MasterServicesPage />} />

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