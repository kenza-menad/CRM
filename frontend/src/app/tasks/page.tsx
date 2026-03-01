"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ─────────────────────────── Types ─────────────────────────── */
type Task = {
  id: string;
  title: string;
  due_at: string | null;
  done: boolean;
  contact_id: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  assigned_email?: string | null;
  created_at: string;
};

type Contact = { id: string; first_name: string; last_name: string };
type Lead = { id: string; title: string };
type User = { id: string; first_name: string; last_name: string; email: string };

/* ─────────────────────────── Helpers ─────────────────────────── */
function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isOverdue(due_at: string | null, done: boolean) {
  if (!due_at || done) return false;
  return new Date(due_at) < new Date();
}

/* ═══════════════════════════ Page ═══════════════════════════ */
export default function TasksPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  /* ── State ── */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── Filters ── */
  const [filterDone, setFilterDone] = useState<"all" | "todo" | "done">("all");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [q, setQ] = useState("");

  /* ── Modal ── */
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ── Form fields ── */
  const [fTitle, setFTitle] = useState("");
  const [fDueAt, setFDueAt] = useState("");
  const [fDone, setFDone] = useState(false);
  const [fContactId, setFContactId] = useState("");
  const [fLeadId, setFLeadId] = useState("");
  const [fAssignedTo, setFAssignedTo] = useState("");

  /* ─────────────── Auth ─────────────── */
  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  /* ─────────────── Fetch ─────────────── */
  async function loadTasks() {
    setError(null); setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setTasks(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRelations() {
    const t = getToken(); if (!t) return;
    const headers = { Authorization: `Bearer ${t}` };
    try {
      const [rc, rl] = await Promise.all([
        fetch(`${API}/contacts`, { headers }),
        fetch(`${API}/leads`, { headers }),
      ]);
      if (rc.ok) setContacts(await rc.json());
      if (rl.ok) setLeads(await rl.json());
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadTasks();
    loadRelations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  /* ─────────────── Filtered tasks ─────────────── */
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterDone === "todo" && t.done) return false;
      if (filterDone === "done" && !t.done) return false;
      if (filterOverdue && !isOverdue(t.due_at, t.done)) return false;
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterDone, filterOverdue, q]);

  /* ── Stats ── */
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const overdue = tasks.filter(t => isOverdue(t.due_at, t.done)).length;
  const todo = tasks.filter(t => !t.done).length;

  /* ─────────────── Modal helpers ─────────────── */
  function openCreate() {
    setError(null); setEditingId(null);
    setFTitle(""); setFDueAt(""); setFDone(false);
    setFContactId(""); setFLeadId(""); setFAssignedTo("");
    setOpen(true);
  }

  function openEdit(task: Task) {
    setError(null); setEditingId(task.id);
    setFTitle(task.title);
    setFDueAt(task.due_at ? task.due_at.slice(0, 16) : "");
    setFDone(task.done);
    setFContactId(task.contact_id ?? "");
    setFLeadId(task.lead_id ?? "");
    setFAssignedTo(task.assigned_to ?? "");
    setOpen(true);
  }

  /* ─────────────── CRUD ─────────────── */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const t = getToken(); if (!t) return;
    if (!fTitle.trim()) { setError("Titre requis"); return; }

    setSaving(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `${API}/tasks/${editingId}` : `${API}/tasks`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          title: fTitle.trim(),
          due_at: fDueAt || null,
          done: fDone,
          contact_id: fContactId || null,
          lead_id: fLeadId || null,
          assigned_to: fAssignedTo || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setOpen(false);
      await loadTasks();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleDone(task: Task) {
    const t = getToken(); if (!t) return;
    try {
      await fetch(`${API}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ done: !task.done }),
      });
      setTasks(prev => prev.map(tk => tk.id === task.id ? { ...tk, done: !tk.done } : tk));
    } catch { /* silent */ }
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer cette tâche ?")) return;
    const t = getToken(); if (!t) return;
    try {
      await fetch(`${API}/tasks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      setTasks(prev => prev.filter(tk => tk.id !== id));
    } catch { /* silent */ }
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
              <SidebarItem active label="Tâches" onClick={() => router.push("/tasks")} />
              <div className="mt-4 border-t border-slate-300 pt-4">
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

          {/* Header sticky */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold">Tâches</h1>
                  <p className="text-sm text-slate-500">Gérez vos rappels, rendez-vous et appels</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={loadTasks}
                    title="Rafraîchir"
                  >⟳</button>
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                    onClick={openCreate}
                  >+ Nouvelle tâche</button>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-slate-300">
                  <span className="text-slate-400">🔎</span>
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Rechercher une tâche..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                  />
                </div>

                <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {(["all", "todo", "done"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterDone(f)}
                      className={classNames(
                        "px-3 py-2 text-sm border-r border-slate-200 last:border-0",
                        filterDone === f ? "bg-slate-100 font-medium" : "hover:bg-slate-50"
                      )}
                    >
                      {f === "all" ? "Toutes" : f === "todo" ? "À faire" : "Terminées"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setFilterOverdue(!filterOverdue)}
                  className={classNames(
                    "rounded-xl border px-3 py-2 text-sm",
                    filterOverdue
                      ? "border-rose-300 bg-rose-50 text-rose-700 font-medium"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  ⚠ En retard
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">

            {/* ── Stats cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="📋" label="Total" value={total} color="text-slate-600" />
              <StatCard icon="⏳" label="À faire" value={todo} color="text-blue-600" />
              <StatCard icon="✅" label="Terminées" value={done} color="text-emerald-600" />
              <StatCard icon="⚠️" label="En retard" value={overdue} color="text-rose-600" />
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <div className="font-semibold">Erreur</div>
                <div className="mt-1 text-rose-700">{error}</div>
              </div>
            )}

            {/* ── Content ── */}
            {loading ? (
              <SkeletonTasks />
            ) : filtered.length === 0 ? (
              <EmptyState onCreate={openCreate} />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  <div className="col-span-1">Statut</div>
                  <div className="col-span-4">Tâche</div>
                  <div className="col-span-2">Échéance</div>
                  <div className="col-span-2">Contact / Lead</div>
                  <div className="col-span-2">Assigné à</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {filtered.map(task => (
                  <div
                    key={task.id}
                    className={classNames(
                      "grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-slate-100 last:border-0 items-center hover:bg-slate-50",
                      task.done && "opacity-60"
                    )}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1">
                      <button
                        onClick={() => toggleDone(task)}
                        className={classNames(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          task.done
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 hover:border-emerald-400"
                        )}
                      >
                        {task.done && <span className="text-xs">✓</span>}
                      </button>
                    </div>

                    {/* Titre */}
                    <div className="col-span-4">
                      <div className={classNames("font-medium", task.done && "line-through text-slate-400")}>
                        {task.title}
                      </div>
                    </div>

                    {/* Échéance */}
                    <div className="col-span-2">
                      {task.due_at ? (
                        <span className={classNames(
                          "text-xs rounded-lg px-2 py-1",
                          isOverdue(task.due_at, task.done)
                            ? "bg-rose-100 text-rose-700 font-medium"
                            : "bg-slate-100 text-slate-600"
                        )}>
                          {formatDate(task.due_at)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>

                    {/* Contact / Lead */}
                    <div className="col-span-2 text-xs text-slate-500">
                      {task.contact_id
                        ? contacts.find(c => c.id === task.contact_id)
                          ? `👤 ${contacts.find(c => c.id === task.contact_id)!.first_name} ${contacts.find(c => c.id === task.contact_id)!.last_name}`
                          : "—"
                        : task.lead_id
                        ? `🎯 ${leads.find(l => l.id === task.lead_id)?.title ?? "Lead"}`
                        : "—"
                      }
                    </div>

                    {/* Assigné */}
                    <div className="col-span-2 text-xs text-slate-500 truncate">
                      {task.assigned_email ?? "—"}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end gap-1">
                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        onClick={() => openEdit(task)}
                      >Modifier</button>
                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={() => onDelete(task.id)}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ══ Modal create / edit ══ */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <div className="text-lg font-semibold">{editingId ? "Modifier la tâche" : "Nouvelle tâche"}</div>
                <div className="text-sm text-slate-500">Rappel, rendez-vous ou appel à planifier</div>
              </div>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => { setOpen(false); setEditingId(null); }}
              >✕</button>
            </div>

            <form onSubmit={onSubmit} className="p-5 space-y-4">
              {/* Titre */}
              <div>
                <label className="text-sm font-medium">Titre *</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                  value={fTitle}
                  onChange={e => setFTitle(e.target.value)}
                  placeholder="Ex: Appeler Sophie Martin pour suivi..."
                  required
                />
              </div>

              {/* Date + Done */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date d'échéance</label>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                    value={fDueAt}
                    onChange={e => setFDueAt(e.target.value)}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setFDone(!fDone)}
                      className={classNames(
                        "h-5 w-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors",
                        fDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                      )}
                    >
                      {fDone && <span className="text-xs">✓</span>}
                    </div>
                    <span className="text-sm">Déjà terminée</span>
                  </label>
                </div>
              </div>

              {/* Contact + Lead */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Contact lié</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                    value={fContactId}
                    onChange={e => setFContactId(e.target.value)}
                  >
                    <option value="">Aucun</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Lead lié</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                    value={fLeadId}
                    onChange={e => setFLeadId(e.target.value)}
                  >
                    <option value="">Aucun</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                  onClick={() => { setOpen(false); setEditingId(null); }}
                >Annuler</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? (editingId ? "Modification..." : "Création...") : editingId ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
      <div className="text-4xl">✅</div>
      <div className="mt-3 text-lg font-semibold">Aucune tâche</div>
      <div className="mt-1 text-sm text-slate-500">Crée ta première tâche pour suivre tes actions.</div>
      <button
        onClick={onCreate}
        className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >+ Nouvelle tâche</button>
    </div>
  );
}

function SkeletonTasks() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
        Chargement...
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-slate-100 flex items-center gap-4">
          <div className="h-5 w-5 rounded-full animate-pulse bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-24 animate-pulse rounded bg-slate-100 ml-auto" />
        </div>
      ))}
    </div>
  );
}