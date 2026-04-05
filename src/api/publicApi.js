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