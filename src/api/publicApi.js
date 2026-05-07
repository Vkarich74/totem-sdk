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

export async function getMobileReferral(options = {}) {
  const params = new URLSearchParams();
  const country = String(options.country || "").trim();
  const city = String(options.city || "").trim();

  if (country) {
    params.set("country", country);
  }

  if (city) {
    params.set("city", city);
  }

  const query = params.toString();
  const url = query ? `${API}/public/mobile/referral?${query}` : `${API}/public/mobile/referral`;
  const res = await fetch(url);
  const json = await res.json();
  return json;
}

export async function getPublicPushConfig() {
  const res = await fetch(`${API}/public/push/config`);

  try {
    const json = await res.json();

    if (!res.ok) {
      return json;
    }

    return json;
  } catch (error) {
    if (!res.ok) {
      throw new Error("PUBLIC_PUSH_CONFIG_REQUEST_FAILED");
    }

    throw error;
  }
}

export async function getMobileNotifications(options = {}) {
  const params = new URLSearchParams();
  const country = String(options.country || "").trim();
  const city = String(options.city || "").trim();
  const audience = String(options.audience || "").trim();
  const readerType = String(options.reader_type || "").trim();
  const readerId = String(options.reader_id || "").trim();
  const limit = String(options.limit || "").trim();

  if (country) {
    params.set("country", country);
  }

  if (city) {
    params.set("city", city);
  }

  if (audience) {
    params.set("audience", audience);
  }

  if (readerType) {
    params.set("reader_type", readerType);
  }

  if (readerId) {
    params.set("reader_id", readerId);
  }

  if (limit) {
    params.set("limit", limit);
  }

  const query = params.toString();
  const url = query ? `${API}/public/mobile/notifications?${query}` : `${API}/public/mobile/notifications`;
  const res = await fetch(url);

  try {
    const json = await res.json();

    return {
      ok: Boolean(json?.ok),
      notifications: Array.isArray(json?.notifications) ? json.notifications : [],
      error: json?.ok ? "" : String(json?.error || "PUBLIC_MOBILE_NOTIFICATIONS_REQUEST_FAILED"),
    };
  } catch (error) {
    if (!res.ok) {
      return {
        ok: false,
        notifications: [],
        error: "PUBLIC_MOBILE_NOTIFICATIONS_REQUEST_FAILED",
      };
    }

    throw error;
  }
}

export async function postMobileReferralEvent(payload = {}) {
  const res = await fetch(`${API}/public/mobile/referral/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  try {
    const json = await res.json();

    if (!res.ok) {
      return json;
    }

    return json;
  } catch (error) {
    if (!res.ok) {
      throw new Error("PUBLIC_MOBILE_REFERRAL_EVENT_REQUEST_FAILED");
    }

    throw error;
  }
}

export async function postMobileFeedback(payload = {}) {
  const res = await fetch(`${API}/public/mobile/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  try {
    const json = await res.json();

    if (!res.ok) {
      return json;
    }

    return json;
  } catch (error) {
    if (!res.ok) {
      throw new Error("PUBLIC_MOBILE_FEEDBACK_REQUEST_FAILED");
    }

    throw error;
  }
}

export async function postMobileDataRequest(payload = {}) {
  const res = await fetch(`${API}/public/mobile/data-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  try {
    const json = await res.json();

    if (!res.ok) {
      return json;
    }

    return json;
  } catch (error) {
    if (!res.ok) {
      throw new Error("PUBLIC_MOBILE_DATA_REQUEST_REQUEST_FAILED");
    }

    throw error;
  }
}

export async function postMobileEvent(payload = {}) {
  const res = await fetch(`${API}/public/mobile/events`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  try {
    const json = await res.json();

    if (!res.ok) {
      return json;
    }

    return json;
  } catch (error) {
    if (!res.ok) {
      throw new Error("PUBLIC_MOBILE_EVENT_REQUEST_FAILED");
    }

    throw error;
  }
}

export async function postMobileNotificationRead(notificationUid, payload = {}) {
  const safeNotificationUid = encodeURIComponent(String(notificationUid || "").trim());
  const res = await fetch(`${API}/public/mobile/notifications/${safeNotificationUid}/read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  try {
    const json = await res.json();

    if (!res.ok) {
      return json;
    }

    return json;
  } catch (error) {
    if (!res.ok) {
      throw new Error("PUBLIC_MOBILE_NOTIFICATION_READ_REQUEST_FAILED");
    }

    throw error;
  }
}

export async function postMobilePushSubscription(payload = {}) {
  const res = await fetch(`${API}/public/mobile/push-subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  try {
    const json = await res.json();

    if (!res.ok) {
      return json;
    }

    return json;
  } catch (error) {
    if (!res.ok) {
      throw new Error("PUBLIC_MOBILE_PUSH_SUBSCRIPTION_SAVE_REQUEST_FAILED");
    }

    throw error;
  }
}

export async function deleteMobilePushSubscription(deviceId, payload = {}) {
  const safeDeviceId = encodeURIComponent(String(deviceId || "").trim());
  const res = await fetch(`${API}/public/mobile/push-subscriptions/${safeDeviceId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  try {
    const json = await res.json();

    if (!res.ok) {
      return json;
    }

    return json;
  } catch (error) {
    if (!res.ok) {
      throw new Error("PUBLIC_MOBILE_PUSH_SUBSCRIPTION_REVOKE_REQUEST_FAILED");
    }

    throw error;
  }
}
