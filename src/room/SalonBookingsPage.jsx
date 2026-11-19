import { Navigate, useSearchParams } from "react-router-dom";

// Compatibility route for existing /#/bookings links. Its old inline
// widget queried personal salon bookings from PUBLIC endpoints and offered
// anonymous status actions. The existing authenticated SalonLayout is
// the sole owner dashboard; never add another bookings read/write client.
export default function SalonBookingsPage({ slug = "" }) {
  const [searchParams] = useSearchParams();
  const salonSlug = String(
    searchParams.get("salon") ||
    slug ||
    (typeof window !== "undefined" ? window.SALON_SLUG : "") ||
    ""
  ).trim();

  if (!/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/.test(salonSlug)) {
    return <div role="alert" style={{ padding: 20 }}>
      Салон не указан или его адрес некорректен.
    </div>;
  }

  // HashRouter stays in control. SalonLayout/SessionGate validates the
  // owner's existing auth_sessions session; the internal API enforces scope.
  return <Navigate to={"/salon/" + encodeURIComponent(salonSlug) + "/bookings"} replace />;
}
