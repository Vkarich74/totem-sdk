import { useEffect, useState } from "react";
import { clearAuthAccessToken } from "../api/internal.js";
import "./pages/AdminDashboard.css";
import "./AdminLayout.css";

/**
 * Shared visual shell for authenticated TOTEM Admin routes.
 * Existing administrative pages remain the content of this shell.
 * The login page and auth error states stay outside AdminLayout.
 */
const GROUPS = [
  {
    heading: "Операции",
    links: [
      ["Лиды", "#/admin/leads", "users"],
      ["Кейсы", "#/admin/cases", "shield"],
      ["Сообщения", "#/admin/messages", "message"],
      ["Уведомления", "#/admin/notifications", "bell"],
    ],
  },
  {
    heading: "Участники",
    links: [
      ["Владельцы", "#/admin/owners", "building"],
      ["Клиенты", "#/admin/clients", "clients"],
      ["Открытие владельца", "#/admin/open-owner", "person-add"],
    ],
  },
  {
    heading: "Финансы",
    links: [
      ["Финансы", "#/admin/finance", "wallet"],
      ["Центр вывода", "#/admin/withdrawals", "withdraw"],
    ],
  },
  {
    heading: "Система",
    links: [["Мобильное", "#/admin/mobile", "mobile"]],
  },
];

const ICONS = {
  dashboard: ["M3 3h8v8H3z", "M15 3h6v5h-6z", "M15 12h6v9h-6z", "M3 15h8v6H3z"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M19 8h4", "M21 6v4"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M12 7v6", "M12 17h.01"],
  message: ["M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3a8.5 8.5 0 0 1 8.5 8.5z", "M8 11h9", "M8 14h6"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  building: ["M3 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16", "M3 21h18", "M7 7h2", "M12 7h2", "M7 11h2", "M12 11h2", "M7 15h2", "M12 15h2", "M17 9h4v12"],
  clients: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  "person-add": ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M19 8v6", "M16 11h6"],
  wallet: ["M3 6h18v14H3z", "M3 10h18", "M7 16h3", "M16 16h2"],
  withdraw: ["M12 3v13", "M7 11l5 5 5-5", "M4 17v4h16v-4"],
  mobile: ["M6 2h12v20H6z", "M11 18h2"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  close: ["M18 6 6 18", "M6 6l12 12"],
  check: ["M20 6 9 17l-5-5"],
};

function Icon({ name, size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {(ICONS[name] || ICONS.dashboard).map((path) => <path d={path} key={path} />)}
    </svg>
  );
}

function currentRoute() {
  const hash = String(window.location.hash || "");
  if (hash.startsWith("#/admin")) {
    return hash.replace(/^#\/admin\/?/, "").split("?")[0].replace(/\/$/, "");
  }
  const path = String(window.location.pathname || "");
  if (path.startsWith("/admin")) {
    return path.replace(/^\/admin\/?/, "").split("?")[0].replace(/\/$/, "");
  }
  return "";
}

function goTo(event, to) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (window.location.hash === to) return;
  // Preserve the existing AdminRouter reload contract.
  window.location.hash = to;
  window.location.reload();
}

function NavLink({ to, icon, children, selected, onNavigate }) {
  return (
    <a href={to}
      className={"tc-menu-link" + (selected ? " tc-menu-link--selected" : "")}
      aria-current={selected ? "page" : undefined}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (onNavigate) onNavigate();
        goTo(event, to);
      }}>
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </a>
  );
}

export default function AdminLayout({ children }) {
  const route = currentRoute();
  const dashboard = route === "";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("totem-admin-dashboard-body");
    return () => document.body.classList.remove("totem-admin-dashboard-body");
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function logout() {
    clearAuthAccessToken();
    window.location.hash = "#/admin/login";
    window.location.reload();
  }

  return (
    <div className="totem-control-center tc-admin-shell" data-admin-layout="v2">
      <a href="#tc-main" className="tc-skip" onClick={(event) => {
        event.preventDefault();
        document.getElementById("tc-main")?.focus();
      }}>Перейти к содержимому</a>

      <header className="tc-topbar">
        <div className="tc-brand">
          <span className="tc-brand__symbol"><Icon name="dashboard" size={22} /></span>
          <span className="tc-brand__text"><strong>TOTEM</strong><small>CONTROL CENTER</small></span>
        </div>
        <div className="tc-topbar__end">
          <span className="tc-role"><Icon name="check" size={16} /> Администратор</span>
          <button type="button" className="tc-menu-toggle" aria-controls="tc-sidebar"
            aria-expanded={menuOpen} aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setMenuOpen((open) => !open)}>
            <Icon name={menuOpen ? "close" : "menu"} size={22} />
          </button>
        </div>
      </header>

      <div className="tc-layout">
        {menuOpen ? (
          <button type="button" className="tc-backdrop" aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)} />
        ) : null}
        <aside id="tc-sidebar" className={"tc-sidebar" + (menuOpen ? " tc-sidebar--open" : "")}
          aria-label="Навигация TOTEM Admin">
          <div className="tc-sidebar__links">
            <div className="tc-group-label">Рабочее пространство</div>
            <NavLink to="#/admin" icon="dashboard" selected={dashboard}
              onNavigate={() => setMenuOpen(false)}>Обзор платформы</NavLink>
            {GROUPS.map((group) => (
              <nav className="tc-menu-group" aria-label={group.heading} key={group.heading}>
                <div className="tc-group-label">{group.heading}</div>
                {group.links.map(([label, to, icon]) => (
                  <NavLink key={to} to={to} icon={icon}
                    selected={route === to.replace("#/admin/", "")}
                    onNavigate={() => setMenuOpen(false)}>{label}</NavLink>
                ))}
              </nav>
            ))}
          </div>
          <div className="tc-sidebar__bottom">
            <small>Административный доступ</small>
            <button type="button" className="tc-logout" onClick={logout}>
              <Icon name="logout" size={18} /> Выйти
            </button>
          </div>
        </aside>

        <main className="tc-main" id="tc-main" tabIndex={-1}>
          {dashboard ? children : (
            <div className="tc-container tc-admin-content" data-admin-route={route}>
              <div className="tc-admin-context"><span aria-hidden="true" />УПРАВЛЕНИЕ ПЛАТФОРМОЙ</div>
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
