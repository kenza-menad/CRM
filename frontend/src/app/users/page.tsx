"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "commercial" | "user";
  is_active?: boolean;
  created_at: string;
};

function cx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", commercial: "Commercial", user: "Utilisateur",
};
const ROLE_COLORS: Record<string, string> = {
  admin:      "bg-purple-100 text-purple-700",
  commercial: "bg-blue-100 text-blue-700",
  user:       "bg-slate-100 text-slate-600",
};
const ROLE_ICONS: Record<string, string> = {
  admin: "", commercial: "", user: "",
};

export default function UsersPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  // Récupérer l'utilisateur connecté depuis le token JWT
  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("token");
    if (!t) return null;
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.id ?? payload.sub ?? null;
    } catch { return null; }
  }, []);

  const currentUserRole = useMemo(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("token");
    if (!t) return null;
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.role ?? null;
    } catch { return null; }
  }, []);

  const isAdmin = currentUserRole === "admin";

  const [users,      setUsers]      = useState<User[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [q,          setQ]          = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal création
  const [open,      setOpen]      = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");
  const [fFirst,    setFFirst]    = useState("");
  const [fLast,     setFLast]     = useState("");
  const [fEmail,    setFEmail]    = useState("");
  const [fPassword, setFPassword] = useState("");
  const [fRole,     setFRole]     = useState<"commercial" | "user">("commercial");

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function loadUsers() {
    setError(null); setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const res  = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Filtres
  const filtered = useMemo(() => {
    return users.filter(u => {
      if (filterRole !== "all" && u.role !== filterRole) return false;
      if (q) {
        const s = q.toLowerCase();
        return `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(s);
      }
      return true;
    });
  }, [users, filterRole, q]);

  // Stats
  const stats = useMemo(() => ({
    total:      users.length,
    admins:     users.filter(u => u.role === "admin").length,
    commerciaux:users.filter(u => u.role === "commercial").length,
    utilisateurs:users.filter(u => u.role === "user").length,
  }), [users]);

  // Changer rôle
  async function changeRole(id: string, role: string) {
    const t = getToken(); if (!t) return;
    try {
      const res  = await fetch(`${API}/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erreur");
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: data.role ?? role as any } : u));
    } catch (e: any) { setError(e.message); }
  }

  // Supprimer
  async function onDelete(id: string) {
    const t = getToken(); if (!t) return;
    try {
      await fetch(`${API}/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeletingId(null);
    } catch (e: any) { setError(e.message); }
  }

  // Créer utilisateur
  function openCreate() {
    setFormError(""); setFFirst(""); setFLast(""); setFEmail(""); setFPassword(""); setFRole("commercial");
    setOpen(true);
  }
  function closeModal() { setOpen(false); setFormError(""); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    const t = getToken(); if (!t) return;
    if (!fFirst.trim() || !fLast.trim() || !fEmail.trim() || !fPassword.trim()) {
      setFormError("Tous les champs sont obligatoires."); return;
    }
    if (fPassword.length < 6) { setFormError("Mot de passe minimum 6 caractères."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          first_name: fFirst.trim(), last_name: fLast.trim(),
          email: fEmail.trim(), password: fPassword, role: fRole,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erreur création");
      setUsers(prev => [data, ...prev]);
      closeModal();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  /* ── Accès réservé aux admins ── */
  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl border border-slate-200 p-12 max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-lg font-semibold text-slate-800">Accès réservé</h2>
          <p className="text-sm text-slate-500 mt-2">
            Cette page est accessible uniquement aux <span className="font-semibold text-purple-600">administrateurs</span>.
          </p>
          <button onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            ← Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">

        
        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">

          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">👥 Utilisateurs</h1>
                  <p className="text-sm text-slate-500">Gérez les comptes et les rôles de votre équipe</p>
                </div>

                {/* KPIs */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{stats.total}</div>
                    <div className="text-xs text-slate-400">Total</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <div className="font-bold text-purple-600">{stats.admins}</div>
                    <div className="text-xs text-slate-400">Admins</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <div className="font-bold text-blue-600">{stats.commerciaux}</div>
                    <div className="text-xs text-slate-400">Commerciaux</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={openCreate}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    + Nouvel utilisateur
                  </button>
                  <button onClick={loadUsers}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    title="Rafraîchir">⟳</button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-400">
                  <span className="text-slate-400 text-sm">🔎</span>
                  <input className="w-full bg-transparent text-sm outline-none"
                    placeholder="Rechercher un utilisateur..."
                    value={q} onChange={e => setQ(e.target.value)} />
                </div>

                <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {(["all", "admin", "commercial", "user"] as const).map(r => (
                    <button key={r} onClick={() => setFilterRole(r)}
                      className={cx(
                        "px-3 py-2 text-sm font-medium border-r border-slate-200 last:border-0 transition-colors",
                        filterRole === r ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
                      )}>
                      {r === "all" ? "Tous" : `${ROLE_ICONS[r]} ${ROLE_LABELS[r]}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-6 space-y-5">

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                ⚠️ {error}
              </div>
            )}

            {/* Tableau */}
            {loading ? <SkeletonUsers /> : filtered.length === 0 ? (
              <EmptyState onCreate={openCreate} />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-3">Utilisateur</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-2">Rôle</div>
                  <div className="col-span-2">Statut</div>
                  <div className="col-span-1">Inscrit le</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {filtered.map(user => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <div key={user.id}
                      className={cx(
                        "grid grid-cols-12 gap-2 px-5 py-3.5 text-sm border-b border-slate-100 last:border-0 items-center hover:bg-slate-50 transition-colors",
                        isSelf && "bg-emerald-50/30"
                      )}>

                      {/* Nom + avatar */}
                      <div className="col-span-3 flex items-center gap-2.5">
                        <div className={cx(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                          user.role === "admin" ? "bg-purple-500" : user.role === "commercial" ? "bg-blue-500" : "bg-slate-400"
                        )}>
                          {user.first_name?.[0] ?? "?"}{user.last_name?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {user.first_name} {user.last_name}
                          </div>
                          {isSelf && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                              Vous
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <div className="col-span-3 text-xs text-slate-500 truncate">{user.email}</div>

                      {/* Rôle */}
                      <div className="col-span-2">
                        {isSelf ? (
                          <span className={cx("rounded-lg px-2 py-1 text-xs font-medium", ROLE_COLORS[user.role])}>
                            {ROLE_ICONS[user.role]} {ROLE_LABELS[user.role]}
                          </span>
                        ) : (
                          <select value={user.role} onChange={e => changeRole(user.id, e.target.value)}
                            className={cx("rounded-lg px-2 py-1 text-xs font-medium border-0 outline-none cursor-pointer", ROLE_COLORS[user.role])}>
                            <option value="admin">Admin</option>
                            <option value="commercial">Commercial</option>
                            <option value="user">Utilisateur</option>
                          </select>
                        )}
                      </div>

                      {/* Statut actif */}
                      <div className="col-span-2">
                        <span className={cx(
                          "text-[10px] font-medium px-2 py-1 rounded-full",
                          user.is_active !== false
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        )}>
                          {user.is_active !== false ? "● Actif" : "○ Inactif"}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="col-span-1 text-xs text-slate-400">{formatDate(user.created_at)}</div>

                      {/* Actions */}
                      <div className="col-span-1 flex justify-end">
                        {!isSelf && (
                          deletingId === user.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => setDeletingId(null)}
                                className="rounded-lg px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100">
                                Annuler
                              </button>
                              <button onClick={() => onDelete(user.id)}
                                className="rounded-lg px-2 py-1 text-[10px] text-white bg-rose-500 hover:bg-rose-600">
                                Confirmer
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeletingId(user.id)}
                              className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Supprimer">🗑</button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-medium">
                  {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}
                  {filterRole !== "all" && ` · filtre : ${ROLE_LABELS[filterRole]}`}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ══ Modal création ══ */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Nouvel utilisateur</h2>
                <p className="text-xs text-slate-400 mt-0.5">Le compte sera créé immédiatement</p>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Prénom <span className="text-rose-500">*</span></label>
                  <input autoFocus
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    value={fFirst} onChange={e => setFFirst(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Nom <span className="text-rose-500">*</span></label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    value={fLast} onChange={e => setFLast(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Email <span className="text-rose-500">*</span></label>
                <input type="email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  value={fEmail} onChange={e => setFEmail(e.target.value)} required />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Mot de passe <span className="text-rose-500">*</span></label>
                <input type="password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  value={fPassword} onChange={e => setFPassword(e.target.value)}
                  placeholder="Minimum 6 caractères" required />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Rôle</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["commercial", "user"] as const).map(r => (
                    <button key={r} type="button" onClick={() => setFRole(r)}
                      className={cx(
                        "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                        fRole === r
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}>
                      {ROLE_ICONS[r]} {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Seul un admin peut promouvoir en Admin depuis le tableau.
                </p>
              </div>

              {formError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-600">
                  ⚠️ {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Création...
                    </span>
                  ) : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ Sub-components ══ */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
      <div className="text-4xl mb-3">👥</div>
      <div className="text-lg font-semibold text-slate-800">Aucun utilisateur</div>
      <div className="mt-1 text-sm text-slate-500">Créez le premier compte de votre équipe.</div>
      <button onClick={onCreate}
        className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        + Nouvel utilisateur
      </button>
    </div>
  );
}

function SkeletonUsers() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 h-10 animate-pulse" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full animate-pulse bg-slate-200 flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}