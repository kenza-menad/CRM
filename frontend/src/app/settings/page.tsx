"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

function cx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  commercial: "Commercial",
  user: "Utilisateur",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  commercial: "bg-amber-100 text-amber-700",
  user: "bg-slate-100 text-slate-600",
};

export default function SettingsPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const currentUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const t = localStorage.getItem("token");
      if (!t) return null;
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.sub;
    } catch { return null; }
  }, []);

  const currentRole = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const t = localStorage.getItem("token");
      if (!t) return null;
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.role;
    } catch { return null; }
  }, []);

  const [activeTab, setActiveTab] = useState<"users" | "profile">("profile");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // ── États profil ──
  const [pFirstName, setPFirstName] = useState("");
  const [pLastName, setPLastName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pJobTitle, setPJobTitle] = useState("");
  const [pPassword, setPPassword] = useState("");
  const [pSaving, setPSaving] = useState(false);
  const [pSuccess, setPSuccess] = useState(false);
  const [pError, setPError] = useState<string | null>(null);

  // ── États invitation ──
  const [showInvite, setShowInvite] = useState(false);
  const [iFirstName, setIFirstName] = useState("");
  const [iLastName, setILastName] = useState("");
  const [iEmail, setIEmail] = useState("");
  const [iRole, setIRole] = useState("commercial");
  const [iPassword, setIPassword] = useState("");
  const [iSaving, setISaving] = useState(false);
  const [iError, setIError] = useState<string | null>(null);
  const [iSuccess, setISuccess] = useState<string | null>(null);

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function loadUsers() {
    setLoading(true); setError(null);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setUsers(Array.isArray(data) ? data : []);
      // ✅ Pré-remplir profil depuis la liste
      const me = (data as any[]).find((u) => u.id === currentUserId);
      if (me) {
        setPFirstName(me.first_name ?? "");
        setPLastName(me.last_name ?? "");
        setPEmail(me.email ?? "");
        setPPhone(me.phone ?? "");
        setPJobTitle(me.job_title ?? "");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ✅ Charge le profil complet pour les non-admins
  async function loadProfile() {
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/users/${currentUserId}`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const me = await res.json();
        setPFirstName(me.first_name ?? "");
        setPLastName(me.last_name ?? "");
        setPEmail(me.email ?? "");
        setPPhone(me.phone ?? "");
        setPJobTitle(me.job_title ?? "");
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    if (currentRole === "admin") {
      setActiveTab("users");
      loadUsers();
    } else {
      loadProfile();
    }
  }, [router]);

  async function changeRole(userId: string, role: string) {
    const t = getToken(); if (!t) return;
    setSavingId(userId);
    try {
      const res = await fetch(`${API}/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Erreur lors du changement de rôle");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (e: any) { setError(e.message); }
    finally { setSavingId(null); }
  }

  async function toggleActive(userId: string, current: boolean) {
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/users/${userId}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ is_active: !current }),
      });
      if (!res.ok) throw new Error("Erreur");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u));
    } catch (e: any) { setError(e.message); }
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Supprimer ${name} ? Cette action est irréversible.`)) return;
    const t = getToken(); if (!t) return;
    try {
      await fetch(`${API}/users/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e: any) { setError(e.message); }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setIError(null); setISuccess(null);
    if (!iFirstName.trim() || !iLastName.trim() || !iEmail.trim() || !iPassword.trim()) {
      setIError("Tous les champs sont obligatoires"); return;
    }
    const t = getToken(); if (!t) return;
    setISaving(true);
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          first_name: iFirstName.trim(), last_name: iLastName.trim(),
          email: iEmail.trim(), password: iPassword.trim(), role: iRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur lors de la création");
      setISuccess(`✅ ${iFirstName} ${iLastName} a été créé avec succès !`);
      setIFirstName(""); setILastName(""); setIEmail(""); setIPassword(""); setIRole("commercial");
      await loadUsers();
    } catch (e: any) { setIError(e.message); }
    finally { setISaving(false); }
  }

  // ✅ Sauvegarde avec phone et job_title
  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setPError(null); setPSuccess(false);
    if (!pFirstName.trim() || !pLastName.trim() || !pEmail.trim()) {
      setPError("Prénom, nom et email sont obligatoires"); return;
    }
    const t = getToken(); if (!t) return;
    setPSaving(true);
    try {
      const res = await fetch(`${API}/users/${currentUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          first_name: pFirstName.trim(),
          last_name: pLastName.trim(),
          email: pEmail.trim(),
          phone: pPhone.trim() || null,
          job_title: pJobTitle.trim() || null,
          ...(pPassword.trim() ? { password: pPassword.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      setPSuccess(true);
      setPPassword("");
      setTimeout(() => setPSuccess(false), 3000);
    } catch (e: any) {
      setPError(e.message);
    } finally {
      setPSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">

        {/* Sidebar */}
        <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-slate-300 md:bg-white">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <div>
              <div className="text-sm font-semibold">FormaPro CRM</div>
              <div className="text-xs text-slate-500">Agence de Formation</div>
            </div>
          </div>
          <div className="flex-1 px-3 pb-3 pt-6">
            <nav className="text-sm space-y-0.5">
              {[
                { label: "Dashboard",   path: "/dashboard",   icon: "📊" },
                { label: "Contacts",    path: "/contacts",    icon: "👤" },
                { label: "Entreprises", path: "/entreprises", icon: "🏢" },
                { label: "Leads",       path: "/leads",       icon: "🎯" },
                { label: "Deals",       path: "/deals",       icon: "💼" },
                { label: "Pipeline",    path: "/pipeline",    icon: "📈" },
                { label: "Tâches",      path: "/tasks",       icon: "✅" },
              ].map(item => (
                <button key={item.path} onClick={() => router.push(item.path)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-600 hover:bg-slate-50">
                  <span>{item.icon}</span><span>{item.label}</span>
                </button>
              ))}
              <div className="pt-3 mt-3 border-t border-slate-100">
                <button onClick={() => router.push("/settings")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left bg-emerald-50 text-emerald-700 font-medium">
                  <span>⚙️</span><span>Paramètres</span>
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-5xl px-6 py-4">
              <h1 className="text-xl font-semibold text-slate-900">⚙️ Paramètres</h1>
              <p className="text-sm text-slate-500">Gérez les utilisateurs et votre profil</p>
            </div>
          </div>

          <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">

            {/* Onglets */}
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
              {currentRole === "admin" && (
                <button onClick={() => setActiveTab("users")}
                  className={cx("px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === "users" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
                  👥 Utilisateurs
                </button>
              )}
              <button onClick={() => setActiveTab("profile")}
                className={cx("px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === "profile" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
                👤 Mon profil
              </button>
            </div>

            {error && currentRole === "admin" && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">⚠️ {error}</div>
            )}

            {/* ══ Utilisateurs (admin seulement) ══ */}
            {activeTab === "users" && currentRole === "admin" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Membres de l'équipe</h2>
                    <p className="text-sm text-slate-500">{users.length} utilisateur{users.length > 1 ? "s" : ""}</p>
                  </div>
                  <button onClick={() => { setShowInvite(true); setIError(null); setISuccess(null); }}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    + Ajouter un utilisateur
                  </button>
                </div>

                {showInvite && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-emerald-900">Nouvel utilisateur</h3>
                      <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
                    </div>
                    <form onSubmit={handleInvite} className="space-y-3">
                      {iError && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{iError}</div>}
                      {iSuccess && <div className="rounded-xl bg-emerald-100 border border-emerald-300 p-3 text-sm text-emerald-800">{iSuccess}</div>}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-700">Prénom *</label>
                          <input value={iFirstName} onChange={e => setIFirstName(e.target.value)} placeholder="Marie"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700">Nom *</label>
                          <input value={iLastName} onChange={e => setILastName(e.target.value)} placeholder="Dupont"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-700">Email *</label>
                          <input type="email" value={iEmail} onChange={e => setIEmail(e.target.value)} placeholder="marie@agence.com"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700">Mot de passe *</label>
                          <input type="password" value={iPassword} onChange={e => setIPassword(e.target.value)} placeholder="••••••••"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700">Rôle</label>
                        <select value={iRole} onChange={e => setIRole(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                          <option value="commercial">Commercial</option>
                          <option value="user">Utilisateur</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setShowInvite(false)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50">Annuler</button>
                        <button type="submit" disabled={iSaving}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                          {iSaving ? "Création..." : "Créer l'utilisateur"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {loading ? <SkeletonUsers /> : (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <div className="col-span-3">Utilisateur</div>
                      <div className="col-span-2">Rôle</div>
                      <div className="col-span-1">Statut</div>
                      <div className="col-span-2">Email</div>
                      <div className="col-span-1">Depuis</div>
                      <div className="col-span-3 text-right">Actions</div>
                    </div>
                    {users.map(user => {
                      const isMe = user.id === currentUserId;
                      const isActive = user.is_active !== false;
                      return (
                        <div key={user.id}
                          className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50">
                          <div className="col-span-3 flex items-center gap-3">
                            <div className={cx("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                              isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400")}>
                              {user.first_name?.[0] ?? "?"}{user.last_name?.[0] ?? ""}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">{user.first_name} {user.last_name}</div>
                              {isMe && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md">Vous</span>}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className={cx("text-xs rounded-lg px-2 py-1 font-medium", ROLE_COLORS[user.role] ?? "bg-slate-100 text-slate-600")}>
                              {ROLE_LABELS[user.role] ?? user.role}
                            </span>
                          </div>
                          <div className="col-span-1">
                            <span className={cx("text-xs rounded-lg px-2 py-1 font-medium",
                              isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                              {isActive ? "● Actif" : "○ Inactif"}
                            </span>
                          </div>
                          <div className="col-span-2 text-xs text-slate-500 truncate">{user.email}</div>
                          <div className="col-span-1 text-xs text-slate-400">
                            {new Date(user.created_at).toLocaleDateString("fr-FR")}
                          </div>
                          <div className="col-span-3 flex justify-end items-center gap-1">
                            {!isMe ? (
                              <>
                                <select value={user.role} disabled={savingId === user.id}
                                  onChange={e => changeRole(user.id, e.target.value)}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none bg-white hover:border-slate-300 disabled:opacity-50">
                                  <option value="user">Utilisateur</option>
                                  <option value="commercial">Commercial</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button onClick={() => toggleActive(user.id, isActive)}
                                  className={cx("rounded-lg border px-2 py-1 text-xs transition whitespace-nowrap",
                                    isActive ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50")}>
                                  {isActive ? "Désactiver" : "Activer"}
                                </button>
                                <button onClick={() => deleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">✕</button>
                              </>
                            ) : <span className="text-xs text-slate-300">—</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ Profil ══ */}
            {activeTab === "profile" && (
              <div className="max-w-lg">
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-base font-semibold text-slate-900 mb-5">Mon profil</h2>
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    {pError && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{pError}</div>}
                    {pSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">✅ Profil mis à jour !</div>}

                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold">
                        {pFirstName?.[0] ?? "?"}{pLastName?.[0] ?? ""}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{pFirstName} {pLastName}</div>
                        <div className="text-xs text-slate-400">{pJobTitle || pEmail}</div>
                      </div>
                    </div>

                    {/* Prénom + Nom */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Prénom *</label>
                        <input value={pFirstName} onChange={e => setPFirstName(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Nom *</label>
                        <input value={pLastName} onChange={e => setPLastName(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-sm font-medium text-slate-700">Email *</label>
                      <input type="email" value={pEmail} onChange={e => setPEmail(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                    </div>

                    {/* Téléphone + Poste */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Téléphone</label>
                        <input value={pPhone} onChange={e => setPPhone(e.target.value)}
                          placeholder="+33 6 12 34 56 78"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Poste / Fonction</label>
                        <input value={pJobTitle} onChange={e => setPJobTitle(e.target.value)}
                          placeholder="Commercial, Manager..."
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                      </div>
                    </div>

                   

                    <div className="pt-2">
                      <button type="submit" disabled={pSaving}
                        className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                        {pSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Zone de danger */}
                <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-5">
                  <button onClick={() => { localStorage.removeItem("token"); router.push("/login"); }}
                    className="rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

function SkeletonUsers() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
          <div className="h-8 w-8 rounded-full animate-pulse bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-2 w-48 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}