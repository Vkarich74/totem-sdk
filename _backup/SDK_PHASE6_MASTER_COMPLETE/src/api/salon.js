import { apiGet } from "./client"

export function getSalonBookings(slug) {
  return apiGet(`/internal/salons/${slug}/bookings`)
}

export function getSalonClients(slug) {
  return apiGet(`/internal/salons/${slug}/clients`)
}

export function getSalonMetrics(slug) {
  return apiGet(`/internal/salons/${slug}/metrics`)
}