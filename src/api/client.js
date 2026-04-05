const API_BASE = "https://api.totemv.com"

export async function apiGet(url) {

  const res = await fetch(API_BASE + url)

  if (!res.ok) {
    throw new Error("API_ERROR")
  }

  return res.json()
}