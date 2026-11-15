// US-04 route selector: legacy KG/KZ BookingPage is imported unchanged.
// US view is selected ONLY from the salon's server-side market binding.
// A missing legacy market binding remains on the original booking page.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BookingPage from "./BookingPage.jsx";
import UsBookingPage from "../us/UsBookingPage.jsx";

const API_BASE = String(
  import.meta.env.VITE_API_BASE ||
  (typeof window !== "undefined" ? window.TOTEM_API_BASE : "") ||
  "https://api.totemv.com"
).replace(/\/$/, "");

export default function MarketBookingEntry() {
  const [searchParams] = useSearchParams();
  const hashSearchParams = useMemo(() => {
    const hash = String(window.location.hash || "");
    const index = hash.indexOf("?");
    return new URLSearchParams(index < 0 ? "" : hash.slice(index + 1));
  }, []);
  const nativeParams = useMemo(
    () => new URLSearchParams(window.location.search || ""), []
  );
  const slug = searchParams.get("salon") ||
    hashSearchParams.get("salon") ||
    nativeParams.get("salon") ||
    window.SALON_SLUG ||
    "";
  const [resolution, setResolution] = useState({ status: "loading", slug: "" });

  useEffect(() => {
    if (!slug) {
      setResolution({ status: "legacy", slug: "" });
      return undefined;
    }
    let active = true;
    const controller = new AbortController();
    setResolution({ status: "loading", slug });
    fetch(`${API_BASE}/public/salons/${encodeURIComponent(slug)}`, {
      credentials: "omit",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    }).then(response => {
      if (!response.ok) throw new Error("SALON_PROFILE_UNAVAILABLE");
      return response.json();
    }).then(payload => {
      if (!active) return;
      const marketCode = String(payload?.salon?.market_code || "").toUpperCase();
      setResolution({
        status: marketCode === "US" ? "us" : "legacy",
        slug,
        salonName: String(payload?.salon?.name || ""),
      });
    }).catch(error => {
      if (!active || error?.name === "AbortError") return;
      // Existing KG/KZ behavior is preserved if the server cannot provide
      // the new additive market_code field. Active US backend still applies
      // its independent tenant, country and booking access guards.
      setResolution({ status: "legacy", slug });
    });
    return () => { active = false; controller.abort(); };
  }, [slug]);

  if (resolution.slug !== slug || resolution.status === "loading") {
    return <main aria-busy="true" role="status" style={{ padding: 24 }}>TOTEM · Loading…</main>;
  }
  if (resolution.status !== "us") return <BookingPage />;
  return (
    <UsBookingPage
      slug={slug}
      salonName={resolution.salonName}
      marketContext={{ market_code: "US", currency_code: "USD" }}
    />
  );
}
