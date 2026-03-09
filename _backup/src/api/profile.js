const API_BASE = "https://api.totemv.com";

/**
 * Release-1 rule:
 * - SDK работает только через public API.
 * - Никаких /internal вызовов из браузера.
 */

/**
 * Получить профиль мастера (public).
 * Если backend не поддерживает — вернёт ошибку вызывающему коду.
 */
export async function getMasterProfile(masterId) {
  const res = await fetch(`${API_BASE}/public/masters/${masterId}/profile`, {
    credentials: "include",
    headers: {
      "Cache-Control": "no-cache",
      Accept: "application/json",
    },
  });
  return res.json();
}

// Alias для совместимости (если где-то импортируют другими именами)
export async function getProfile(masterId) {
  return getMasterProfile(masterId);
}

/**
 * Обновление профиля в SDK отключено до Odoo.
 * Важно: тут нет /internal и нет секретов.
 */
export async function updateMasterProfile() {
  return {
    ok: false,
    error: "Profile update disabled in SDK (available via Odoo only).",
  };
}

// Alias для совместимости
export async function updateProfile() {
  return updateMasterProfile();
}

export default {
  getMasterProfile,
  getProfile,
  updateMasterProfile,
  updateProfile,
};