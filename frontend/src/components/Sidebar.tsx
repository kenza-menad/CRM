"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

// SVG icons — no emojis
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  contacts: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  entreprises: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  leads: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  deals: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  pipeline: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  tasks: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  emails: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  close: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

const NAV_MAIN: NavItem[] = [
  { label: "Dashboard",   path: "/dashboard",   icon: Icons.dashboard },
  { label: "Contacts",    path: "/contacts",    icon: Icons.contacts },
  { label: "Entreprises", path: "/entreprises", icon: Icons.entreprises },
  { label: "Leads",       path: "/leads",       icon: Icons.leads },
  { label: "Pipeline",    path: "/pipeline",    icon: Icons.pipeline },
  { label: "Tâches",      path: "/tasks",       icon: Icons.tasks },
];

const NAV_ADMIN: NavItem[] = [
  { label: "Utilisateurs", path: "/users",  icon: Icons.users },
  { label: "Emails",       path: "/emails", icon: Icons.emails },
];

// Bottom mobile nav — only main items
const NAV_MOBILE: NavItem[] = [
  { label: "Dashboard", path: "/dashboard",   icon: Icons.dashboard },
  { label: "Contacts",  path: "/contacts",    icon: Icons.contacts },
  { label: "Leads",     path: "/leads",       icon: Icons.leads },
  { label: "Deals",     path: "/deals",       icon: Icons.deals },
  { label: "Tâches",    path: "/tasks",       icon: Icons.tasks },
];

type SidebarProps = {
  userRole?: "admin" | "commercial" | "user";
  userName?: string;
  userInitials?: string;
};

export default function Sidebar({ userRole = "admin", userName = "Utilisateur", userInitials = "U" }: SidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(path + "/");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  const NavLink = ({ item }: { item: NavItem }) => (
    <button
      onClick={() => router.push(item.path)}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-150 text-left group
        ${isActive(item.path)
          ? "bg-emerald-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }
      `}
    >
      <span className={`flex-shrink-0 transition-colors ${isActive(item.path) ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}>
        {item.icon}
      </span>
      {item.label}
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">F</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">FormaPro CRM</p>
          <p className="text-xs text-slate-400 truncate">Marketing Digital</p>
        </div>
      </div>

      {/* Nav principale */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_MAIN.map(item => <NavLink key={item.path} item={item} />)}

        {/* Section admin */}
        {userRole === "admin" && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">Administration</p>
            </div>
            {NAV_ADMIN.map(item => <NavLink key={item.path} item={item} />)}
          </>
        )}
      </nav>

      {/* Footer user */}
      <div className="border-t border-slate-100 p-3 space-y-1">
        <button
          onClick={() => router.push("/settings")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group
            ${isActive("/settings") ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
        >
          <span className={`flex-shrink-0 ${isActive("/settings") ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}>
            {Icons.settings}
          </span>
          Paramètres
        </button>

        {/* User card */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-default">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-emerald-700">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
            <p className="text-[10px] text-slate-400 capitalize">{userRole}</p>
          </div>
          <button onClick={handleLogout} title="Se déconnecter"
            className="flex-shrink-0 text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50">
            {Icons.logout}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ═══ DESKTOP sidebar (md+) ═══ */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* ═══ MOBILE — top bar ═══ */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <p className="text-sm font-bold text-slate-900">FormaPro CRM</p>
        </div>
        <button onClick={() => setOpen(v => !v)}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
          {open ? Icons.close : Icons.menu}
        </button>
      </div>

      {/* MOBILE — drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          {/* Drawer */}
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ═══ MOBILE — bottom tab bar ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-2 safe-area-pb">
        {NAV_MOBILE.map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
              isActive(item.path) ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
            }`}>
            <span className={`transition-transform ${isActive(item.path) ? "scale-110" : ""}`}>
              {item.icon}
            </span>
            <span className={`text-[10px] font-medium ${isActive(item.path) ? "text-emerald-600" : "text-slate-400"}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
}