const API = "https://api.totemv.com";

export async function getSalon(slug) {
  const res = await fetch(`${API}/public/salons/${slug}`);
  if (res.status === 404) return null;

  const json = await res.json();
  return json.salon;
}

export async function getMasters(slug) {
  const res = await fetch(`${API}/public/salons/${slug}/masters`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.masters || [];
}

export async function getMetrics(slug) {
  const res = await fetch(`${API}/public/salons/${slug}/metrics`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.metrics || null;
}

export async function getMobileConfig() {
  const res = await fetch(`${API}/public/mobile/config`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.config || null;
}

export async function getMobileLocations() {
  const res = await fetch(`${API}/public/mobile/locations`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.locations || null;
}

export async function getMobileCityHome(countryCode, citySlug) {
  const normalizedCountryCode = encodeURIComponent(
    String(countryCode || "").trim().toUpperCase()
  );
  const normalizedCitySlug = encodeURIComponent(
    String(citySlug || "").trim().toLowerCase()
  );
  const res = await fetch(
    `${API}/public/mobile/city/${normalizedCountryCode}/${normalizedCitySlug}/home`
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.home || null;
}

export async function getMobileSalonCatalog(slug) {
  const normalizedSlug = encodeURIComponent(String(slug || "").trim());
  const res = await fetch(`${API}/public/mobile/salons/${normalizedSlug}/catalog`);
  if (!res.ok) return null;
  const json = await res.json();
  return json;
}

export async function getMobileAnnouncements(options = {}) {
  const params = new URLSearchParams();
  const country = String(options.country || "").trim();
  const city = String(options.city || "").trim();
  const audience = String(options.audience || "").trim();

  if (country) {
    params.set("country", country);
  }

  if (city) {
    params.set("city", city);
  }

  if (audience) {
    params.set("audience", audience);
  }

  const query = params.toString();
  const url = query ? `${API}/public/mobile/announcements?${query}` : `${API}/public/mobile/announcements`;
  const res = await fetch(url);

  if (!res.ok) {
    return {
      ok: false,
      announcements: [],
      error: "PUBLIC_MOBILE_ANNOUNCEMENTS_REQUEST_FAILED",
    };
  }

  const json = await res.json();

  return {
    ok: Boolean(json?.ok),
    announcements: Array.isArray(json?.announcements) ? json.announcements : [],
  };
}
