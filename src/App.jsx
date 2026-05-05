import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import ErrorBoundary from "./core/ErrorBoundary";

import PublicSalonPage from "./public/PublicSalonPage";
import PublicMasterPage from "./public/PublicMasterPage";
import MobileHomePage from "./public/MobileHomePage.jsx";
import MobileLiteAdminPage from "./mobile/MobileLiteAdminPage.jsx";

import BookingPage from "./room/BookingPage";
import SalonBookingsPage from "./room/SalonBookingsPage";
import ClientCabinetPage from "./client/ClientCabinetPage";

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
import AdminMessagesPage from "./admin/pages/AdminMessagesPage";
import AdminLoginPage from "./admin/pages/AdminLoginPage";
import AdminLeadsPage from "./admin/pages/AdminLeadsPage";
import AdminCasesPage from "./admin/pages/AdminCasesPage";
import AdminDashboardPage from "./admin/pages/AdminDashboardPage";
import AdminClientsPage from "./admin/pages/AdminClientsPage";
import AdminOpenOwnerPage from "./admin/pages/AdminOpenOwnerPage";
import AdminOwnersPage from "./admin/pages/AdminOwnersPage";
import AdminFinancePage from "./admin/pages/AdminFinancePage";
import AdminMobilePage from "./admin/pages/AdminMobilePage";
import AdminNotificationsPage from "./admin/pages/AdminNotificationsPage";

/* MASTER FINANCE */
import MasterMoneyPage from "./master/payments/MasterMoneyPage";
import MasterTransactionsPage from "./master/payments/MasterTransactionsPage";
import MasterSettlementsPage from "./master/payments/MasterSettlementsPage";
import MasterPayoutsPage from "./master/payments/MasterPayoutsPage";

/* NEW MASTER FINANCE CONTROL PAGE */
import MasterFinancePage from "./master/payments/MasterFinancePage";

/* AUTH */
import AuthLayout from "./auth/AuthLayout";
import LoginPage from "./auth/LoginPage";
import VerifyCodePage from "./auth/VerifyCodePage";
import SetPasswordPage from "./auth/SetPasswordPage";
import ForgotPasswordPage from "./auth/ForgotPasswordPage";
import ResetPasswordPage from "./auth/ResetPasswordPage";

import {
  clearAuthAccessToken,
  hasAuthAccessToken,
  resolveSession
} from "./api/internal";

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
  const path = clean.split("?")[0];
  return path.split("/").filter(Boolean);
}

function getPathParts() {
  const path = window.location.pathname || "";
  return path.split("/").filter(Boolean);
}

function getSlugFromSearchForType(type) {
  const params = new URLSearchParams(window.location.search || "");
  const slug = String(params.get("slug") || "").trim();
  const pathParts = getPathParts();

  if (!slug || pathParts[0] !== type) {
    return null;
  }

  return slug;
}

function isAdminRoute() {
  const hash = window.location.hash || "";
  const pathname = window.location.pathname || "";

  return hash.startsWith("#/admin") || pathname.startsWith("/admin");
}

function isAdminLoginRoute() {
  const hashParts = getHashParts();
  const pathParts = getPathParts();
  const adminParts = hashParts[0] === "admin" ? hashParts : pathParts;

  return adminParts[0] === "admin" && adminParts[1] === "login";
}

function getCurrentAdminReturnTo() {
  const hash = window.location.hash || "";
  if (hash.startsWith("#/admin")) {
    return hash.replace(/^#/, "").split("?")[0] || "/admin";
  }

  const pathname = window.location.pathname || "";
  if (pathname.startsWith("/admin")) {
    return pathname.split("?")[0] || "/admin";
  }

  return "/admin";
}

function getStoredAuthToken() {
  return String(
    window.localStorage.getItem("TOTEM_AUTH_TOKEN") ||
    window.localStorage.getItem("TOTEM_ACCESS_TOKEN") ||
    ""
  ).trim();
}

function decodeAuthTokenPayload(token) {
  try {
    const payload = String(token || "").split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function getAuthTokenRole(token) {
  const payload = decodeAuthTokenPayload(token);
  return String(payload?.role || "").toLowerCase();
}

function clearStoredAuthTokens() {
    clearAuthAccessToken();
  }

function getStoredSalonSlug() {
  return (
    window.SALON_SLUG ||
    getSlugFromSearchForType("salon") ||
    window.localStorage.getItem("totem_salon_slug") ||
    window.sessionStorage.getItem("totem_salon_slug") ||
    null
  );
}

function getStoredMasterSlug() {
  return (
    window.MASTER_SLUG ||
    getSlugFromSearchForType("master") ||
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

function MobileLiteAdminRoute({ roleType }) {
  const { slug } = useParams();
  return <MobileLiteAdminPage roleType={roleType} slug={slug} />;
}

function MobileLiteAdminDynamicRoute() {
  const { roleType, slug } = useParams();
  return <MobileLiteAdminPage roleType={roleType} slug={slug} />;
}

function getPublicRouteFromPathname() {
  const pathParts = getPathParts();
  const hashParts = getHashParts();

  if (pathParts[0] === "m") {
    if (pathParts[1] === "booking") {
      return { type: "booking" };
    }

    if (pathParts[1] === "app") {
      return { type: "mobile" };
    }

    if (pathParts[1] === "city" && pathParts[2] && pathParts[3]) {
      return { type: "mobile" };
    }
  }

  if (pathParts[0] === "master" && pathParts[1] && !MASTER_STATIC_SEGMENTS.has(pathParts[1])) {
    return { type: "master", slug: pathParts[1] };
  }

  if (pathParts[0] === "salon" && pathParts[1] && !SALON_STATIC_SEGMENTS.has(pathParts[1])) {
    return { type: "salon", slug: pathParts[1] };
  }

  if (pathParts[0] === "mobile") {
    return { type: "mobile" };
  }

  if (hashParts[0] === "mobile" && hashParts[1] === "admin") {
    return null;
  }

  if (hashParts[0] === "mobile") {
    return { type: "mobile" };
  }

  if (hashParts[0] === "booking") {
    return { type: "booking" };
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
  const location = useLocation();
  const publicRoute = getPublicRouteFromPathname();

  void location;

  if (!publicRoute) {
    return null;
  }

  if (publicRoute.type === "master") {
    return <PublicMasterPage slug={publicRoute.slug} />;
  }

  if (publicRoute.type === "mobile") {
    return <MobileHomePage />;
  }

  if (publicRoute.type === "booking") {
    return <BookingPage />;
  }

  return <PublicSalonPage slug={publicRoute.slug} />;
}

function AuthBootstrapGate({ children }){
  const [state, setState] = useState({
    loading: true
  });

  useEffect(() => {
    let active = true;

    async function run(){
      const token = getStoredAuthToken();

      if(token && getAuthTokenRole(token) === "admin"){
        clearStoredAuthTokens();

        if(active){
          setState({ loading: false });
        }
        return;
      }

      if(!hasAuthAccessToken()){
        if(active){
          setState({ loading: false });
        }
        return;
      }

      const session = await resolveSession();

      if(!active) return;

      if(!session?.ok || !session?.authenticated){
        clearAuthAccessToken();
        clearStoredAuthTokens();
      }else if(String(session?.auth?.role || session?.role || "").toLowerCase() === "admin"){
        clearAuthAccessToken();
        clearStoredAuthTokens();
      }

      setState({ loading: false });
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  if(state.loading){
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          color: "#111827",
          font: "16px/1.5 Arial, sans-serif"
        }}
      >
        Проверка сессии…
      </div>
    );
  }

  return children;
}

function AdminAuthGate({ children }) {
  const [state, setState] = useState({
    loading: true,
    status: "loading",
    error: "",
    retryKey: 0,
  });

  function retry() {
    setState({
      loading: true,
      status: "loading",
      error: "",
      retryKey: state.retryKey + 1,
    });
  }

  useEffect(() => {
    let active = true;

    async function run() {
      const token = String(window.localStorage.getItem("TOTEM_AUTH_TOKEN") || "").trim();

      if (!token) {
        if (active) {
          setState((current) => ({
            ...current,
            loading: false,
            status: "login",
            error: "",
          }));
        }
        return;
      }

      try {
        const response = await fetch("https://api.totemv.com/internal/admin/auth/session", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json().catch(() => null);

        if (!active) return;

        if (response.status === 401) {
          clearAuthAccessToken();
          setState((current) => ({
            ...current,
            loading: false,
            status: "login",
            error: "",
          }));
          return;
        }

          if (response.status === 403) {
            clearAuthAccessToken();
            setState((current) => ({
              ...current,
              loading: false,
              status: "forbidden",
            error: "FORBIDDEN",
          }));
          return;
        }

        if (
          response.ok &&
          payload?.ok === true &&
          payload?.authenticated === true &&
          String(payload?.auth?.role || "") === "admin"
        ) {
          setState((current) => ({
            ...current,
            loading: false,
            status: "authenticated",
            error: "",
          }));
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          status: "error",
          error: payload?.error || `HTTP_${response.status}`,
        }));
      } catch (error) {
        if (active) {
          setState((current) => ({
            ...current,
            loading: false,
            status: "error",
            error: error?.message || "ADMIN_SESSION_CHECK_FAILED",
          }));
        }
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [state.retryKey]);

  useEffect(() => {
    if (state.status !== "login" || isAdminLoginRoute()) {
      return;
    }

    const returnTo = getCurrentAdminReturnTo();
    const targetHash = `#/admin/login?returnTo=${encodeURIComponent(returnTo)}`;

    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, [state.status]);

  if (state.loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          color: "#111827",
          font: "16px/1.5 Arial, sans-serif"
        }}
      >
        Проверка admin session…
      </div>
    );
  }

  if (state.status === "login") {
    return <AdminLoginPage />;
  }

  if (state.status === "forbidden") {
    return (
      <div style={{ padding: 24 }}>
        <h1>Доступ запрещён</h1>
        <p>Требуется admin session.</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div style={{ padding: 24 }}>
        <h1>Ошибка проверки admin session</h1>
        <p>{state.error || "ADMIN_SESSION_CHECK_FAILED"}</p>
        <button type="button" onClick={retry}>
          Повторить
        </button>
      </div>
    );
  }

  return children;
}

function CabinetRouter() {
  const slug = getSlugFromPath();
  const publicType = getPublicPage();

  return (
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

      <Route path="auth" element={<AuthLayout />}>
        <Route index element={<Navigate to="login" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="verify" element={<VerifyCodePage />} />
        <Route path="set-password" element={<SetPasswordPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset" element={<ResetPasswordPage />} />
      </Route>

      <Route path="booking" element={<BookingPage slug={slug} />} />
      <Route path="bookings" element={<SalonBookingsPage slug={slug} />} />
      <Route path="client/:clientId/:token" element={<ClientCabinetPage />} />
      <Route path="mobile/admin/master/:slug" element={<MobileLiteAdminRoute roleType="master" />} />
      <Route path="mobile/admin/salon/:slug" element={<MobileLiteAdminRoute roleType="salon" />} />
      <Route path="mobile/admin/:roleType/:slug" element={<MobileLiteAdminDynamicRoute />} />

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
        <Route path="money" element={<MasterMoneyPage />} />
        <Route path="transactions" element={<MasterTransactionsPage />} />
        <Route path="settlements" element={<MasterSettlementsPage />} />
        <Route path="payouts" element={<MasterPayoutsPage />} />
        <Route path="template" element={<MasterTemplateEditorPage />} />
        <Route path="settings" element={<MasterSettingsPage />} />
      </Route>

    </Routes>
  );
}

function AdminRouter() {
  const hashParts = getHashParts();
  const pathParts = getPathParts();
  const adminParts = hashParts[0] === "admin" ? hashParts : pathParts;
  const adminRoute = adminParts[0] === "admin" ? adminParts[1] || "" : "";

  if (adminRoute === "") {
    return <AdminDashboardPage />;
  }

  if (adminRoute === "login") {
    return <AdminLoginPage />;
  }

  if (adminRoute === "messages") {
    return <AdminMessagesPage />;
  }

  if (adminRoute === "leads") {
    return <AdminLeadsPage />;
  }

  if (adminRoute === "cases") {
    return <AdminCasesPage />;
  }

  if (adminRoute === "clients") {
    return <AdminClientsPage />;
  }

  if (adminRoute === "owners") {
    return <AdminOwnersPage />;
  }

  if (adminRoute === "open-owner") {
    return <AdminOpenOwnerPage />;
  }

  if (adminRoute === "finance") {
    return <AdminFinancePage />;
  }

  if (adminRoute === "mobile") {
    return <AdminMobilePage />;
  }

  if (adminRoute === "notifications") {
    return <AdminNotificationsPage />;
  }

  return <AdminDashboardPage />;
}

export default function App() {
  if (isAdminRoute()) {
    return (
      <ErrorBoundary>
        <HashRouter>
          {isAdminLoginRoute() ? (
            <AdminRouter />
          ) : (
            <AdminAuthGate>
              <AdminRouter />
            </AdminAuthGate>
          )}
        </HashRouter>
      </ErrorBoundary>
    );
  }

  const publicRoute = getPublicRouteFromPathname();

  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthBootstrapGate>
          {publicRoute ? <PublicPathRouter /> : <CabinetRouter />}
        </AuthBootstrapGate>
      </HashRouter>
    </ErrorBoundary>
  );
}
