// tools/master-crm-autowire.mjs
// TOTEM SDK — Master CRM autowire (single-pass)
// - Creates missing Master CRM pages
// - Creates MasterLayout with left menu
// - Patches src/App.jsx to mount /master routes (HashRouter compatible)
// - Makes backups and is idempotent

import fs from "fs";
import fsp from "fs/promises";
import path from "path";

const ROOT = process.cwd();

const SRC_DIR = path.join(ROOT, "src");
const MASTER_DIR = path.join(SRC_DIR, "master");
const APP_FILE = path.join(SRC_DIR, "App.jsx");

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function exists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function backupFile(p) {
  if (!(await exists(p))) return null;
  const bak = `${p}.bak-${nowStamp()}`;
  await fsp.copyFile(p, bak);
  return bak;
}

async function writeIfMissing(filePath, content) {
  if (await exists(filePath)) return { written: false, filePath };
  await fsp.writeFile(filePath, content, "utf8");
  return { written: true, filePath };
}

function normalizeEol(s) {
  // keep existing style? we normalize to \n and let git handle; windows ok
  return s.replace(/\r\n/g, "\n");
}

function ensureReactRouterNamedImport(appText, name) {
  // finds: import { ... } from "react-router-dom";
  const re = /import\s*\{\s*([^}]+)\s*\}\s*from\s*["']react-router-dom["'];/;
  const m = appText.match(re);
  if (!m) return appText; // cannot patch safely
  const inside = m[1]
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (!inside.includes(name)) inside.push(name);

  const replaced = `import { ${inside.join(", ")} } from "react-router-dom";`;
  return appText.replace(re, replaced);
}

function ensureImport(appText, importLine) {
  if (appText.includes(importLine)) return appText;
  // insert after last import
  const lines = appText.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i])) lastImportIdx = i;
  }
  if (lastImportIdx === -1) return importLine + "\n" + appText;
  lines.splice(lastImportIdx + 1, 0, importLine);
  return lines.join("\n");
}

function insertBeforeClosingRoutes(appText, snippet) {
  if (appText.includes('path="/master"') || appText.includes("path='/master'")) return appText;

  const idx = appText.lastIndexOf("</Routes>");
  if (idx === -1) return appText; // cannot patch safely
  return appText.slice(0, idx) + snippet + "\n" + appText.slice(idx);
}

function log(ok, msg) {
  const mark = ok ? "[OK]" : "[ERR]";
  console.log(`${mark} ${msg}`);
}

async function main() {
  // Preconditions
  if (!(await exists(SRC_DIR))) {
    log(false, `Missing src/ folder: ${SRC_DIR}`);
    process.exit(1);
  }
  if (!(await exists(APP_FILE))) {
    log(false, `Missing file: ${APP_FILE}`);
    process.exit(1);
  }

  await ensureDir(path.join(ROOT, "tools"));
  await ensureDir(MASTER_DIR);

  // 1) Create Master pages (only if missing)
  const filesToCreate = [
    {
      file: path.join(MASTER_DIR, "MasterLayout.jsx"),
      content: `import React from "react";
import { NavLink, Outlet } from "react-router-dom";

function Item({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: "block",
        padding: "10px 12px",
        borderRadius: 10,
        textDecoration: "none",
        fontWeight: 600,
        color: isActive ? "#111" : "#333",
        background: isActive ? "rgba(0,0,0,0.08)" : "transparent",
      })}
    >
      {label}
    </NavLink>
  );
}

export default function MasterLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", gap: 18, padding: 18 }}>
      <aside
        style={{
          width: 260,
          borderRadius: 16,
          padding: 14,
          background: "rgba(0,0,0,0.03)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ padding: "6px 6px 12px 6px" }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Панель мастера</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>TOTEM</div>
        </div>

        <nav style={{ display: "grid", gap: 6 }}>
          <Item to="/master/dashboard" label="Главная" />
          <Item to="/master/bookings" label="Записи" />
          <Item to="/master/clients" label="Клиенты" />
          <Item to="/master/schedule" label="Расписание" />
          <Item to="/master/money" label="Доход" />
          <Item to="/master/settings" label="Настройки" />
        </nav>
      </aside>

      <main style={{ flex: 1, borderRadius: 16, padding: 18, border: "1px solid rgba(0,0,0,0.06)" }}>
        <Outlet />
      </main>
    </div>
  );
}
`,
    },
    {
      file: path.join(MASTER_DIR, "MasterBookingsPage.jsx"),
      content: `import React from "react";

export default function MasterBookingsPage() {
  return (
    <div>
      <h2 style={{ margin: 0 }}>Записи</h2>
      <p style={{ opacity: 0.75, marginTop: 8 }}>
        TODO: список записей мастера + действия (подтвердить/отменить/завершить).
      </p>
    </div>
  );
}
`,
    },
    {
      file: path.join(MASTER_DIR, "MasterClientsPage.jsx"),
      content: `import React from "react";

export default function MasterClientsPage() {
  return (
    <div>
      <h2 style={{ margin: 0 }}>Клиенты</h2>
      <p style={{ opacity: 0.75, marginTop: 8 }}>
        TODO: список клиентов мастера + карточка клиента.
      </p>
    </div>
  );
}
`,
    },
    {
      file: path.join(MASTER_DIR, "MasterSchedulePage.jsx"),
      content: `import React from "react";

export default function MasterSchedulePage() {
  return (
    <div>
      <h2 style={{ margin: 0 }}>Расписание</h2>
      <p style={{ opacity: 0.75, marginTop: 8 }}>
        TODO: календарь 07:00–21:00, шаг 15 минут, 56 слотов/день.
      </p>
    </div>
  );
}
`,
    },
    {
      file: path.join(MASTER_DIR, "MasterMoneyPage.jsx"),
      content: `import React from "react";

export default function MasterMoneyPage() {
  return (
    <div>
      <h2 style={{ margin: 0 }}>Доход</h2>
      <p style={{ opacity: 0.75, marginTop: 8 }}>
        TODO: revenue_today / revenue_month + история выплат.
      </p>
    </div>
  );
}
`,
    },
    {
      file: path.join(MASTER_DIR, "MasterSettingsPage.jsx"),
      content: `import React from "react";

export default function MasterSettingsPage() {
  return (
    <div>
      <h2 style={{ margin: 0 }}>Настройки</h2>
      <p style={{ opacity: 0.75, marginTop: 8 }}>
        TODO: профиль мастера, рабочие часы, уведомления.
      </p>
    </div>
  );
}
`,
    },
  ];

  let createdCount = 0;
  for (const f of filesToCreate) {
    const r = await writeIfMissing(f.file, f.content);
    if (r.written) {
      createdCount++;
      log(true, `Created ${path.relative(ROOT, r.filePath)}`);
    } else {
      log(true, `Exists ${path.relative(ROOT, r.filePath)} (skipped)`);
    }
  }

  // Dashboard page must exist already per your state
  const dashboardFile = path.join(MASTER_DIR, "MasterDashboardPage.jsx");
  if (!(await exists(dashboardFile))) {
    log(false, `Expected existing dashboard page missing: ${path.relative(ROOT, dashboardFile)}`);
    log(false, `Stop. Restore dashboard file first, then rerun this script.`);
    process.exit(1);
  } else {
    log(true, `Found ${path.relative(ROOT, dashboardFile)}`);
  }

  // 2) Patch src/App.jsx
  const bak = await backupFile(APP_FILE);
  if (bak) log(true, `Backup created: ${path.relative(ROOT, bak)}`);

  let appText = normalizeEol(await fsp.readFile(APP_FILE, "utf8"));

  // Ensure Navigate is available for index redirect; ensure Route/Routes are there (usually already)
  appText = ensureReactRouterNamedImport(appText, "Navigate");

  // Ensure imports for layout and pages
  appText = ensureImport(appText, `import MasterLayout from "./master/MasterLayout.jsx";`);
  appText = ensureImport(appText, `import MasterDashboardPage from "./master/MasterDashboardPage.jsx";`);
  appText = ensureImport(appText, `import MasterBookingsPage from "./master/MasterBookingsPage.jsx";`);
  appText = ensureImport(appText, `import MasterClientsPage from "./master/MasterClientsPage.jsx";`);
  appText = ensureImport(appText, `import MasterSchedulePage from "./master/MasterSchedulePage.jsx";`);
  appText = ensureImport(appText, `import MasterMoneyPage from "./master/MasterMoneyPage.jsx";`);
  appText = ensureImport(appText, `import MasterSettingsPage from "./master/MasterSettingsPage.jsx";`);

  const masterRoutesSnippet = `
        {/* MASTER CRM (autowired) */}
        <Route path="/master" element={<MasterLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MasterDashboardPage />} />
          <Route path="bookings" element={<MasterBookingsPage />} />
          <Route path="clients" element={<MasterClientsPage />} />
          <Route path="schedule" element={<MasterSchedulePage />} />
          <Route path="money" element={<MasterMoneyPage />} />
          <Route path="settings" element={<MasterSettingsPage />} />
        </Route>
`;

  const before = appText;
  appText = insertBeforeClosingRoutes(appText, masterRoutesSnippet);

  if (before === appText) {
    log(true, `App.jsx already contains /master routes or could not be patched safely (no change).`);
  } else {
    await fsp.writeFile(APP_FILE, appText, "utf8");
    log(true, `Patched ${path.relative(ROOT, APP_FILE)} with /master routes.`);
  }

  log(true, `DONE. Created pages: ${createdCount}.`);
  log(true, `Next: run dev server and open master panel URL.`);
}

main().catch((e) => {
  console.error("[ERR] Unhandled:", e);
  process.exit(1);
});