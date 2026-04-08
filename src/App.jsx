import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./core/ErrorBoundary";

import PublicSalonPage from "./public/PublicSalonPage";
import PublicMasterPage from "./public/PublicMasterPage";

import BookingPage from "./room/BookingPage";
import SalonBookingsPage from "./room/SalonBookingsPage";

import SalonLayout from "./salon/SalonLayout";

/* SALON PAGES */
import DashboardPage from "./salon/pages/DashboardPage";
import MastersPage from "./salon/pages/MastersPage";
import ClientsPage from "./salon/pages/ClientsPage";
import BookingsPage from "./salon/pages/BookingsPage";
import CalendarPage from "./salon/pages/CalendarPage";
import MoneyPage from "./salon/pages/MoneyPage";
import SettingsPage from "./salon/pages/SettingsPage";
import ServicesPage from "./salon/pages/ServicesPage";
import SalonTemplateEditorPage from "./salon/pages/SalonTemplateEditorPage";

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
import MasterDashboard from "./master/pages/MasterDashboard";
import MasterBookingsPage from "./master/pages/MasterBookingsPage";
import MasterClientsPage from "./master/pages/MasterClientsPage";
import MasterSchedulePage from "./master/pages/MasterSchedulePage";
import MasterSettingsPage from "./master/pages/MasterSettingsPage";
import MasterServicesPage from "./master/pages/MasterServicesPage";
import MasterTemplateEditorPage from "./master/pages/MasterTemplateEditorPage";

/* MASTER FINANCE */
import MasterMoneyPage from "./master/payments/MasterMoneyPage";
import MasterTransactionsPage from "./master/payments/MasterTransactionsPage";
import MasterSettlementsPage from "./master/payments/MasterSettlementsPage";
import MasterPayoutsPage from "./master/payments/MasterPayoutsPage";

/* NEW MASTER FINANCE CONTROL PAGE */
import MasterFinancePage from "./master/payments/MasterFinancePage";

const SALON_STATIC_SEGMENTS = new Set([
  "dashboard",
  "calendar",
  "masters",
  "clients",
  "bookings",
  "services",
  "money",
  "finance",
  "contracts",
  "salon-money",
  "transactions",
  "settlements",
  "payouts",
  "settings",
  "template",
]);

const MASTER_STATIC_SEGMENTS = new Set([
  "dashboard",
  "bookings",
  "clients",
  "schedule",
  "services",
  "finance",
  "money",
  "transactions",
  "settlements",
  "payouts",
  "settings",
  "template",
]);

function getHashParts() {
  const hash = window.location.hash || "";
  const clean = hash.replace(/^#\/?/, "");
  return clean.split("/").filter(Boolean);
}

function getPathParts() {
  const path = window.location.pathname || "";
  return path.split("/").filter(Boolean);
}

function getStoredSalonSlug() {
  return (
    window.SALON_SLUG ||
    window.localStorage.getItem("totem_salon_slug") ||
    window.sessionStorage.getItem("totem_salon_slug") ||
    null
  );
}

function getStoredMasterSlug() {
  return (
    window.MASTER_SLUG ||
    window.localStorage.getItem("totem_master_slug") ||
    window.sessionStorage.getItem("totem_master_slug") ||
    null
  );
}

function getSlugFromHash() {
  const parts = getHashParts();

  if (parts[0] === "salon" && parts[1] && !SALON_STATIC_SEGMENTS.has(parts[1])) {
    return parts[1];
  }

  if (parts[0] === "master" && parts[1] && !MASTER_STATIC_SEGMENTS.has(parts[1])) {
    return parts[1];
  }

  return null;
}

function getSlugFromPathname() {
  const parts = getPathParts();

  if (parts[0] === "salon" && parts[1] && !SALON_STATIC_SEGMENTS.has(parts[1])) {
    return parts[1];
  }

  if (parts[0] === "master" && parts[1] && !MASTER_STATIC_SEGMENTS.has(parts[1])) {
    return parts[1];
  }

  return null;
}

function getSlugFromPath() {
  return (
    getSlugFromHash() ||
    getSlugFromPathname() ||
    getStoredSalonSlug() ||
    getStoredMasterSlug() ||
    null
  );
}

function getPublicRouteFromPathname() {
  const pathParts = getPathParts();

  if (pathParts[0] === "master" && pathParts[1] && !MASTER_STATIC_SEGMENTS.has(pathParts[1])) {
    return { type: "master", slug: pathParts[1] };
  }

  if (pathParts[0] === "salon" && pathParts[1] && !SALON_STATIC_SEGMENTS.has(pathParts[1])) {
    return { type: "salon", slug: pathParts[1] };
  }

  return null;
}

function getPublicPage() {
  const pathnameRoute = getPublicRouteFromPathname();

  if (pathnameRoute?.type) {
    return pathnameRoute.type;
  }

  const hashParts = getHashParts();

  if (hashParts[0] === "master" && hashParts[1] && !MASTER_STATIC_SEGMENTS.has(hashParts[1])) {
    return "master";
  }

  if (hashParts[0] === "salon" && hashParts[1] && !SALON_STATIC_SEGMENTS.has(hashParts[1])) {
    return "salon";
  }

  const pathname = window.location.pathname || "";

  if (pathname.startsWith("/master")) {
    return "master";
  }

  if (pathname.startsWith("/salon")) {
    return "salon";
  }

  return "salon";
}

function RedirectToMasterSlug({ tail = "" }) {
  const slug = getStoredMasterSlug() || getSlugFromPath();

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  const normalizedTail = tail ? `/${tail}` : "";
  return <Navigate to={`/master/${slug}${normalizedTail}`} replace />;
}

function PublicPathRouter() {
  const publicRoute = getPublicRouteFromPathname();

  if (!publicRoute) {
    return null;
  }

  if (publicRoute.type === "master") {
    return <PublicMasterPage slug={publicRoute.slug} />;
  }

  return <PublicSalonPage slug={publicRoute.slug} />;
}

function CabinetRouter() {
  const slug = getSlugFromPath();
  const publicType = getPublicPage();

  return (
    <HashRouter>
      <Routes>
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

        <Route path="salon" element={<SalonLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="masters" element={<MastersPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="money" element={<MoneyPage />} />
          <Route path="finance" element={<SalonFinancePage />} />
          <Route path="contracts" element={<SalonContractsPage />} />
          <Route path="salon-money" element={<SalonMoneyPage />} />
          <Route path="transactions" element={<SalonTransactionsPage />} />
          <Route path="settlements" element={<SalonSettlementsPage />} />
          <Route path="payouts" element={<SalonPayoutsPage />} />
          <Route path="template" element={<SalonTemplateEditorPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="salon/:slug" element={<SalonLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="masters" element={<MastersPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="money" element={<MoneyPage />} />
          <Route path="finance" element={<SalonFinancePage />} />
          <Route path="contracts" element={<SalonContractsPage />} />
          <Route path="salon-money" element={<SalonMoneyPage />} />
          <Route path="transactions" element={<SalonTransactionsPage />} />
          <Route path="settlements" element={<SalonSettlementsPage />} />
          <Route path="payouts" element={<SalonPayoutsPage />} />
          <Route path="template" element={<SalonTemplateEditorPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="master" element={<RedirectToMasterSlug />}>
          <Route index element={<RedirectToMasterSlug />} />
        </Route>

        <Route path="master/:slug" element={<MasterLayout />}>
          <Route index element={<MasterDashboard />} />
          <Route path="dashboard" element={<MasterDashboard />} />
          <Route path="bookings" element={<MasterBookingsPage />} />
          <Route path="bookings/:bookingId" element={<MasterBookingsPage />} />
          <Route path="clients" element={<MasterClientsPage />} />
          <Route path="schedule" element={<MasterSchedulePage />} />
          <Route path="services" element={<MasterServicesPage />} />
          <Route path="finance" element={<MasterFinancePage />} />
          <Route path="finance/money" element={<MasterMoneyPage />} />
          <Route path="finance/transactions" element={<MasterTransactionsPage />} />
          <Route path="finance/settlements" element={<MasterSettlementsPage />} />
          <Route path="finance/payouts" element={<MasterPayoutsPage />} />
          <Route path="money" element={<MasterMoneyPage />} />
          <Route path="transactions" element={<MasterTransactionsPage />} />
          <Route path="settlements" element={<MasterSettlementsPage />} />
          <Route path="payouts" element={<MasterPayoutsPage />} />
          <Route path="template" element={<MasterTemplateEditorPage />} />
          <Route path="settings" element={<MasterSettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  const publicRoute = getPublicRouteFromPathname();

  return (
    <ErrorBoundary>
      {publicRoute ? <PublicPathRouter /> : <CabinetRouter />}
    </ErrorBoundary>
  );
}
