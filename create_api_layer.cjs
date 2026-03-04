const fs = require("fs")
const path = require("path")

const base = path.join(__dirname, "src", "api")

if (!fs.existsSync(base)) {
  fs.mkdirSync(base, { recursive: true })
}

const files = {

"client.js": `
const API_BASE = "https://api.totemv.com"

export async function apiGet(url) {

  const res = await fetch(API_BASE + url)

  if (!res.ok) {
    throw new Error("API_ERROR")
  }

  return res.json()
}
`,

"salon.js": `
import { apiGet } from "./client"

export function getSalonBookings(slug) {
  return apiGet(\`/internal/salons/\${slug}/bookings\`)
}

export function getSalonClients(slug) {
  return apiGet(\`/internal/salons/\${slug}/clients\`)
}

export function getSalonMetrics(slug) {
  return apiGet(\`/internal/salons/\${slug}/metrics\`)
}
`,

"master.js": `
import { apiGet } from "./client"

export function getMasterBookings(slug) {
  return apiGet(\`/internal/masters/\${slug}/bookings\`)
}

export function getMasterClients(slug) {
  return apiGet(\`/internal/masters/\${slug}/clients\`)
}

export function getMasterMetrics(slug) {
  return apiGet(\`/internal/masters/\${slug}/metrics\`)
}
`

}

for (const file in files) {

  const filePath = path.join(base, file)

  fs.writeFileSync(filePath, files[file].trim())

  console.log("Создан:", file)

}

console.log("\\nAPI слой успешно создан.")