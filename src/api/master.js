import { apiGet } from "./client"

export function getMasterBookings(slug) {
  return apiGet(`/internal/masters/${slug}/bookings`)
}

export function getMasterClients(slug) {
  return apiGet(`/internal/masters/${slug}/clients`)
}

export function getMasterMetrics(slug) {
  return apiGet(`/internal/masters/${slug}/metrics`)
}