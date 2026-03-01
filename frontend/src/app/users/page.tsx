"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ─────────────────────────── Types ─────────────────────────── */
type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "commercial" | "user";
  created_at: string;
};

/* ─────────────────────────── Helpers ─────────────────────────── */
function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  commercial: "Commercial",
  user: "Utilisateur",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  commercial: "bg-blue-100 text-blue-700",
  user: "bg-slate-100 text-slate-700",
};

/* ═══════════════════════════ Page ═══════════════════════════ */
export default function UsersPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function loadUsers() {
    setError(null); setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/users`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    return users.filter(u => {
      if (filterRole !== "all" && u.role !== filterRole) return false;
      if (q) {
        const search = q.toLowerCase();
        return (
          u.first_name.toLowerCase().includes(search) ||
          u.last_name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [users, filterRole, q]);

  /* ── Stats ── */
  const totalAdmins = users.filter(u => u.role === "admin").length;
  const totalCommerciaux = users.filter(u => u.role === "commercial").length;
  const totalUsers = users.filter(u => u.role === "user").length;

  /* ── Change role ── */
  async function changeRole(id: string, role: string) {
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: data.role } : u));
    } catch (e: any) {
      setError(e.message);
    }
  }

  /* ── Delete ── */
  async function onDelete(id: string) {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    const t = getToken(); if (!t) return;
    try {
      await fetch(`${API}/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  /* ═══════════════════════════ Render ═══════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">

        {/* ── Sidebar ── */}
        <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-slate-300 md:bg-white">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="h-9 w-9 rounded-xl bg-emerald-600" />
            <div>
              <div className="text-sm font-semibold">FormaPro CRM</div>
              <div className="text-xs text-slate-500">Marketing Digital</div>
            </div>
          </div>

          <div className="flex-1 px-3 pb-3 pt-6">
            <nav className="text-sm">
              <SidebarItem label="Dashboard"   onClick={() => router.push("/dashboard")} />
              <SidebarItem label="Contacts"    onClick={() => router.push("/contacts")} />
              <SidebarItem label="Entreprises" onClick={() => router.push("/entreprises")} />
              <SidebarItem label="Leads"       onClick={() => router.push("/leads")} />
              <SidebarItem label="Deals"       onClick={() => router.push("/deals")} />
              <SidebarItem label="Pipeline"    onClick={() => router.push("/pipeline")} />
              <SidebarItem label="Tâches"      onClick={() => router.push("/tasks")} />
              <div className="mt-4 border-t border-slate-300 pt-4">
                <SidebarItem active label="Utilisateurs" onClick={() => router.push("/users")} />
                <SidebarItem label="Paramètres" onClick={() => router.push("/settings")} />
              </div>
            </nav>
          </div>

          <div className="p-4">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="text-sm font-semibold">Besoin d'aide ?</div>
              <div className="mt-1 text-xs text-slate-600">Consultez notre guide d'utilisation</div>
              <button className="mt-3 w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Voir le guide
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 min-w-0">

          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold">Utilisateurs</h1>
                  <p className="text-sm text-slate-500">Gérez les comptes et les rôles de votre équipe</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={loadUsers}
                    title="Rafraîchir"
                  >⟳</button>
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                    onClick={() => router.push("/signup")}
                  >+ Nouvel utilisateur</button>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className="text-slate-400">🔎</span>
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Rechercher un utilisateur..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                  />
                </div>

                <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {(["all", "admin", "commercial", "user"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setFilterRole(r)}
                      className={classNames(
                        "px-3 py-2 text-sm border-r border-slate-200 last:border-0",
                        filterRole === r ? "bg-slate-100 font-medium" : "hover:bg-slate-50"
                      )}
                    >
                      {r === "all" ? "Tous" : ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="👥" label="Total" value={users.length} color="text-slate-700" />
              <StatCard icon="👑" label="Admins" value={totalAdmins} color="text-purple-600" />
              <StatCard icon="💼" label="Commerciaux" value={totalCommerciaux} color="text-blue-600" />
              <StatCard icon="👤" label="Utilisateurs" value={totalUsers} color="text-slate-500" />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {error}
              </div>
            )}

            {/* Table */}
            {loading ? (
              <SkeletonUsers />
            ) : filtered.length === 0 ? (
              <EmptyState onCreate={() => router.push("/signup")} />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  <div className="col-span-3">Nom</div>
                  <div className="col-span-4">Email</div>
                  <div className="col-span-2">Rôle</div>
                  <div className="col-span-2">Inscrit le</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {filtered.map(user => (
                  <div key={user.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-slate-100 last:border-0 items-center hover:bg-slate-50">

                    {/* Nom */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm flex-shrink-0">
                       {user.first_name?.[0] ?? "?"}{user.last_name?.[0] ?? "?"}
                      </div>
                      <div>
                       <div className="font-medium">{user.first_name ?? ""} {user.last_name ?? ""}</div>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="col-span-4 text-slate-600 truncate">{user.email}</div>

                    {/* Rôle */}
                    <div className="col-span-2">
                      <select
                        value={user.role}
                        onChange={e => changeRole(user.id, e.target.value)}
                        className={classNames(
                          "rounded-lg px-2 py-1 text-xs font-medium border-0 outline-none cursor-pointer",
                          ROLE_COLORS[user.role]
                        )}
                      >
                        <option value="admin">👑 Admin</option>
                        <option value="commercial">💼 Commercial</option>
                        <option value="user">👤 Utilisateur</option>
                      </select>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-xs text-slate-500">
                      {formatDate(user.created_at)}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end">
                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={() => onDelete(user.id)}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ══════════════ Sub-components ══════════════ */

function SidebarItem({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50",
        active && "bg-slate-100 text-slate-900"
      )}
    >
      <span className={classNames("h-2 w-2 rounded-full", active ? "bg-emerald-600" : "bg-slate-300")} />
      <span>{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className={classNames("text-2xl font-bold", color)}>{value}</div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center">
      <div className="text-4xl">👥</div>
      <div className="mt-3 text-lg font-semibold">Aucun utilisateur</div>
      <div className="mt-1 text-sm text-slate-500">Créez le premier compte de votre équipe.</div>
      <button
        onClick={onCreate}
        className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >+ Nouvel utilisateur</button>
    </div>
  );
}

function SkeletonUsers() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
        Chargement...
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-slate-100 flex items-center gap-4">
          <div className="h-8 w-8 rounded-full animate-pulse bg-slate-200" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-48 animate-pulse rounded bg-slate-100 ml-4" />
          <div className="h-5 w-20 animate-pulse rounded bg-slate-100 ml-auto" />
        </div>
      ))}
    </div>
  );
}