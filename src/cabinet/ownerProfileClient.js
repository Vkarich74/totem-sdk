import { getAuthAccessToken } from "../api/internal.js";
import {
  assertOwnerProfileTarget, validateOwnerProfileReply, profilePayload,
} from "./ownerProfileModel.js";

function apiUrl(ownerType, ownerSlug) {
  assertOwnerProfileTarget(ownerType, ownerSlug);
  const base = String(
    import.meta.env.VITE_API_BASE ||
    (typeof window !== "undefined" ? window.TOTEM_API_BASE : "") ||
    "https://api.totemv.com"
  ).replace(/\/$/, "");
  return base + "/internal/cabinet-profile/" +
    encodeURIComponent(ownerType) + "/" + encodeURIComponent(ownerSlug);
}

async function request(ownerType, ownerSlug, method, body, signal) {
  const token = getAuthAccessToken();
  if (!token) throw Object.assign(
    new Error("PROFILE_SESSION_REQUIRED"), {status:401}
  );
  const response = await fetch(apiUrl(ownerType, ownerSlug), {
    method, signal, cache: "no-store", credentials: "omit",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      ...(method === "PATCH" ? {"Content-Type":"application/json"} : {}),
    },
    ...(method === "PATCH" ? {body:JSON.stringify(body)} : {}),
  });
  if (!(response.headers.get("content-type") || "").toLowerCase()
    .includes("application/json")) {
    throw Object.assign(
      new Error("PROFILE_RESPONSE_NOT_JSON"), {status:response.status}
    );
  }
  const raw = await response.json();
  if (!response.ok || raw?.ok !== true) {
    throw Object.assign(
      new Error(String(raw?.error || "PROFILE_REQUEST_FAILED")),
      {status:response.status}
    );
  }
  return validateOwnerProfileReply(raw, ownerType, ownerSlug);
}

export async function getOwnerCabinetProfile(ownerType, ownerSlug, {signal} = {}) {
  return request(ownerType, ownerSlug, "GET", null, signal);
}

export async function saveOwnerCabinetProfile(record, values, {signal} = {}) {
  return request(
    record.owner_type, record.owner_slug,
    "PATCH", profilePayload(record, values), signal
  );
}
