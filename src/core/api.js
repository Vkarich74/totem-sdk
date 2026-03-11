const API_BASE = import.meta.env.VITE_API_BASE

async function request(path, options = {}) {

  const url = `${API_BASE}${path}`

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  }

  if (options.body) {
    config.body = JSON.stringify(options.body)
  }

  const response = await fetch(url, config)

  let data = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const error = new Error(data?.error || `HTTP_${response.status}`)
    error.status = response.status
    error.data = data
    error.url = url
    throw error
  }

  return data
}

export function apiGet(path) {
  return request(path)
}

export function apiPost(path, body) {
  return request(path, {
    method: "POST",
    body
  })
}

export function apiPatch(path, body) {
  return request(path, {
    method: "PATCH",
    body
  })
}

export function apiDelete(path) {
  return request(path, {
    method: "DELETE"
  })
}