# TOTEM SDK AUDIT REPORT
- Root: `C:\Work\totem-sdk`
- Generated: `2026-03-03 01:17:33`

## 1) Inventory
- Total files (excluding skip dirs): **43**
- Text-like files scanned: **37**

## 2) Key files presence
- package.json: `package.json`
- vite config: `vite.config.js`
- main entry: `src\main.jsx`
- app: `src\App.jsx`
- router candidates: **0**
- .env files: **1**
  - `.env.production`

## 3) package.json summary
- name: `totem-sdk`
- version: `1.0.0`
- scripts: `dev`, `build`, `preview`, `restart`
- dependencies: **3**, devDependencies: **1**
- router: `react-router-dom` ✅

## 4) src structure (top-level)
`src/` contains:
- `App.css`
- `App.jsx`
- `api`
- `app.js`
- `assets`
- `index.css`
- `layout`
- `main.jsx`
- `public`
- `room`
- `salon`

## 5) Routes detected (best-effort)
- `/`
- `/room`
- `/room/book`
- `/room/bookings`
- `/salon`
- `/salon/:slug`

## 6) API usage & contracts (files referencing patterns)
- public_calls: **11**
  - `src\App.jsx`
  - `src\api\bookings.js`
  - `src\api\clients.js`
  - `src\api\profile.js`
  - `src\api\publicApi.js`
  - `src\api\salonBookings.js`
  - `src\api\salonMasters.js`
  - `src\api\salonMetrics.js`
  - `src\api\schedule.js`
  - `src\room\BookingPage.jsx`
  - `src\room\SalonBookingsPage.jsx`
- internal_calls: **2**
  - `src\api\profile.js`
  - `src\room\SalonBookingsPage.jsx`
- api_base: **9**
  - `src\api\bookings.js`
  - `src\api\clients.js`
  - `src\api\profile.js`
  - `src\api\salonBookings.js`
  - `src\api\salonMasters.js`
  - `src\api\salonMetrics.js`
  - `src\api\schedule.js`
  - `src\room\BookingPage.jsx`
  - `src\room\SalonBookingsPage.jsx`
- internal_key: **1**
  - `src\room\SalonBookingsPage.jsx`
- idempotency: **2**
  - `src\room\BookingPage.jsx`
  - `src\room\SalonBookingsPage.jsx`

## 7) Security red flags
- INTERNAL_KEY-like literals found: **1**
  - `src\room\SalonBookingsPage.jsx` : `c8a4f1d92e7b...f1a6c7` (len=63)

## 8) Code hygiene (where to clean before release)
- console_log: **0**
- console_error: **10**
  - `src\layout\ErrorBoundary.jsx`
  - `src\public\PublicSalonPage.jsx`
  - `src\room\Bookings.jsx`
  - `src\room\Clients.jsx`
  - `src\room\Schedule.jsx`
  - `src\room\Settings.jsx`
  - `src\salon\Bookings.jsx`
  - `src\salon\Masters.jsx`
  - `src\salon\Money.jsx`
  - `src\salon\Reports.jsx`
- alert: **1**
  - `src\room\SalonBookingsPage.jsx`
- todo_fixme: **0**

## 9) fetch() calls (sample)
- `src\api\bookings.js` → `fetch(`${API_BASE}/public/masters/${masterId}/bookings?status=${status}`,     {       credentials: "include",       headers: {         "Cache-Control": "no-cache",       },     }...)`
- `src\api\clients.js` → `fetch(`${API_BASE}/public/masters/${masterId}/clients`,     {       credentials: "include",       headers: {         "Cache-Control": "no-cache",       },     }...)`
- `src\api\profile.js` → `fetch(`${API_BASE}/public/masters/${masterId}/profile`,     {       credentials: "include",       headers: {         "Cache-Control": "no-cache",       },     }...)`
- `src\api\profile.js` → `fetch(`${API_BASE}/internal/masters/${masterId}/profile`,     {       method: "PUT",       headers: {         "Content-Type": "application/json",       },       credentials: "include",       body: JSON.stri...)`
- `src\api\publicApi.js` → `fetch(`${API}/public/salons/${slug}`...)`
- `src\api\publicApi.js` → `fetch(`${API}/public/salons/${slug}/masters`...)`
- `src\api\publicApi.js` → `fetch(`${API}/public/salons/${slug}/metrics`...)`
- `src\api\salonBookings.js` → `fetch(`${API_BASE}/public/salons/${slug}/bookings${query}`,     {       credentials: "include",       headers: {         "Cache-Control": "no-cache",       },     }...)`
- `src\api\salonMasters.js` → `fetch(`${API_BASE}/public/salons/${slug}/masters`,     {       credentials: "include",       headers: {         "Cache-Control": "no-cache",       },     }...)`
- `src\api\salonMetrics.js` → `fetch(`${API_BASE}/public/salons/${slug}/metrics`,     {       credentials: "include",       headers: {         "Cache-Control": "no-cache",       },     }...)`
- `src\api\schedule.js` → `fetch(`${API_BASE}/public/masters/${masterId}/bookings?status=${status}`,     {       credentials: "include",       headers: {         "Cache-Control": "no-cache",       },     }...)`
- `src\room\BookingPage.jsx` → `fetch(`${API_BASE}/public/salons/${slug}/masters`...)`
- `src\room\BookingPage.jsx` → `fetch(`${API_BASE}/public/salons/${slug}/bookings`, {         method: "POST",         headers: {           "Content-Type": "application/json",           "Idempotency-Key": generateKey(...)`
- `src\room\SalonBookingsPage.jsx` → `fetch(`${API_BASE}/public/salons/${salonSlug}/bookings`...)`
- `src\room\SalonBookingsPage.jsx` → `fetch(`${API_BASE}/internal/bookings/${id}/${type}`, {       method: "POST",       headers: {         "Content-Type": "application/json",         "Idempotency-Key": crypto.randomUUID(...)`

## 10) Fingerprints (for control / reproducibility)
- `package.json` sha256: `160e44cdbc7542d2...`
- `vite.config.js` sha256: `f7ecbd84bf5af920...`
- `src\main.jsx` sha256: `1e84eed1e53d3d8e...`

## 11) Release-10d minimal checklist (generated)
- [ ] Remove INTERNAL_KEY from frontend (0 secrets in bundle)
- [ ] No direct `/internal/*` calls from browser (proxy only)
- [ ] `npm run build` passes
- [ ] No `console.log` in release pages
- [ ] Bookings page shows date/time, statuses, actions working
- [ ] Basic pagination or at least limit safeguard (frontend/back)
