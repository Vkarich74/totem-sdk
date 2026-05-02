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
