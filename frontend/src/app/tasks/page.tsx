"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ─────────────────────────── Types ─────────────────────────── */
type Priority = "normal" | "urgent";

type Task = {
  id: string;
  title: string;
  due_at: string | null;
  done: boolean;
  priority: Priority;
  contact_id: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  assigned_email?: string | null;
  created_at: string;
};

type Contact = { id: string; first_name: string; last_name: string };
type Lead    = { id: string; title: string };

/* ─────────────────────────── Helpers ─────────────────────────── */
function cx(...xs: Array<string | false | undefined | null>) {
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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

/* ═══════════════════════════ Page ═══════════════════════════ */
export default function TasksPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  /* ── State ── */
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads,    setLeads]    = useState<Lead[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);

  /* ── View ── */
  const [tab, setTab] = useState<"list" | "calendar">("list");

  /* ── Calendar ── */
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  /* ── Filters ── */
  const [filterDone,     setFilterDone]     = useState<"all" | "todo" | "done">("all");
  const [filterOverdue,  setFilterOverdue]  = useState(false);
  const [filterUrgent,   setFilterUrgent]   = useState(false);
  const [q,              setQ]              = useState("");

  /* ── Modal ── */
  const [open,        setOpen]        = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [fTitle,      setFTitle]      = useState("");
  const [fDueAt,      setFDueAt]      = useState("");
  const [fDone,       setFDone]       = useState(false);
  const [fPriority,   setFPriority]   = useState<Priority>("normal");
  const [fContactId,  setFContactId]  = useState("");
  const [fLeadId,     setFLeadId]     = useState("");
  const [formError,   setFormError]   = useState("");

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
      const res  = await fetch(`${API}/tasks`, { headers: { Authorization: `Bearer ${t}` } });
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
        fetch(`${API}/leads`,    { headers }),
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
  const filtered = useMemo(() => tasks.filter(t => {
    if (filterDone === "todo" && t.done)  return false;
    if (filterDone === "done" && !t.done) return false;
    if (filterOverdue && !isOverdue(t.due_at, t.done)) return false;
    if (filterUrgent && t.priority !== "urgent") return false;
    if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [tasks, filterDone, filterOverdue, filterUrgent, q]);

  /* ── Calendar tasks by day ── */
  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {};
    tasks.forEach(t => {
      if (!t.due_at) return;
      const d = new Date(t.due_at);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(t);
      }
    });
    return map;
  }, [tasks, calYear, calMonth]);

  /* ── Stats ── */
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const overdue = tasks.filter(t => isOverdue(t.due_at, t.done)).length;
  const todo    = tasks.filter(t => !t.done).length;
  const urgent  = tasks.filter(t => t.priority === "urgent" && !t.done).length;

  /* ─────────────── Modal helpers ─────────────── */
  function openCreate() {
    setFormError(""); setEditingId(null);
    setFTitle(""); setFDueAt(""); setFDone(false); setFPriority("normal");
    setFContactId(""); setFLeadId("");
    setOpen(true);
  }

  function openEdit(task: Task) {
    setFormError(""); setEditingId(task.id);
    setFTitle(task.title);
    setFDueAt(task.due_at ? task.due_at.slice(0, 16) : "");
    setFDone(task.done);
    setFPriority(task.priority ?? "normal");
    setFContactId(task.contact_id ?? "");
    setFLeadId(task.lead_id ?? "");
    setOpen(true);
  }

  function closeModal() { setOpen(false); setEditingId(null); setFormError(""); }

  /* ─────────────── CRUD ─────────────── */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    const t = getToken(); if (!t) return;
    if (!fTitle.trim()) { setFormError("Le titre est requis"); return; }
    setSaving(true);
    try {
      const isEdit = !!editingId;
      const res = await fetch(isEdit ? `${API}/tasks/${editingId}` : `${API}/tasks`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          title: fTitle.trim(), due_at: fDueAt || null, done: fDone,
          priority: fPriority,
          contact_id: fContactId || null, lead_id: fLeadId || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      closeModal();
      await loadTasks();
    } catch (e: any) {
      setFormError(e.message);
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

  async function togglePriority(task: Task) {
    const t = getToken(); if (!t) return;
    const newPriority: Priority = task.priority === "urgent" ? "normal" : "urgent";
    try {
      await fetch(`${API}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ priority: newPriority }),
      });
      setTasks(prev => prev.map(tk => tk.id === task.id ? { ...tk, priority: newPriority } : tk));
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

        
        {/* ── Main ── */}
        <main className="flex-1 min-w-0 flex flex-col">

          {/* Header sticky */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">✅ Tâches</h1>
                  <p className="text-sm text-slate-500">Gérez vos rappels, rendez-vous et appels</p>
                </div>

                {/* KPIs */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{todo}</div>
                    <div className="text-xs text-slate-400">À faire</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <div className="font-bold text-emerald-600">{done}</div>
                    <div className="text-xs text-slate-400">Terminées</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <div className={cx("font-bold", overdue > 0 ? "text-rose-500" : "text-slate-900")}>{overdue}</div>
                    <div className="text-xs text-slate-400">En retard</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <div className={cx("font-bold", urgent > 0 ? "text-orange-500" : "text-slate-900")}>{urgent}</div>
                    <div className="text-xs text-slate-400">Urgentes</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{total}</div>
                    <div className="text-xs text-slate-400">Total</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={openCreate}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    + Nouvelle tâche
                  </button>
                  <button onClick={loadTasks}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    title="Rafraîchir">⟳</button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-400">
                  <span className="text-slate-400 text-sm">🔎</span>
                  <input className="w-full bg-transparent text-sm outline-none"
                    placeholder="Rechercher une tâche..."
                    value={q} onChange={e => setQ(e.target.value)} />
                </div>

                {tab === "list" && (
                  <>
                    <select value={filterDone} onChange={e => setFilterDone(e.target.value as any)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                      <option value="all">Toutes</option>
                      <option value="todo">À faire</option>
                      <option value="done">Terminées</option>
                    </select>

                    <button onClick={() => setFilterOverdue(!filterOverdue)}
                      className={cx(
                        "rounded-xl border px-3 py-2 text-sm transition-colors",
                        filterOverdue
                          ? "border-rose-300 bg-rose-50 text-rose-700 font-medium"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      )}>
                      ⚠ En retard
                    </button>

                    <button onClick={() => setFilterUrgent(!filterUrgent)}
                      className={cx(
                        "rounded-xl border px-3 py-2 text-sm transition-colors",
                        filterUrgent
                          ? "border-orange-300 bg-orange-50 text-orange-700 font-medium"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      )}>
                      🔴 Urgent
                    </button>
                  </>
                )}

                <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden ml-auto">
                  <button onClick={() => setTab("list")}
                    className={cx("px-4 py-2 text-sm font-medium transition-colors",
                      tab === "list" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
                    ≡ Liste
                  </button>
                  <button onClick={() => setTab("calendar")}
                    className={cx("px-4 py-2 text-sm font-medium border-l border-slate-200 transition-colors",
                      tab === "calendar" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
                    📅 Calendrier
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 space-y-6">

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                ⚠️ {error}
              </div>
            )}

            {/* ── Vue Calendrier ── */}
            {tab === "calendar" ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between mb-5">
                  <button
                    onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors">
                    ← Précédent
                  </button>
                  <h2 className="text-base font-semibold text-slate-800">{MONTH_NAMES[calMonth]} {calYear}</h2>
                  <button
                    onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors">
                    Suivant →
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-2">
                  {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: (getFirstDayOfMonth(calYear, calMonth) + 6) % 7 }).map((_, i) => (
                    <div key={`e-${i}`} className="h-20" />
                  ))}
                  {Array.from({ length: getDaysInMonth(calYear, calMonth) }).map((_, i) => {
                    const day = i + 1;
                    const dayTasks = tasksByDay[day] ?? [];
                    const isToday = now.getDate() === day && now.getMonth() === calMonth && now.getFullYear() === calYear;
                    return (
                      <div key={day} className={cx(
                        "h-20 rounded-xl border p-1.5 overflow-hidden transition-colors",
                        isToday ? "border-emerald-400 bg-emerald-50" : "border-slate-100 bg-white hover:bg-slate-50"
                      )}>
                        <div className={cx("text-xs font-semibold mb-1",
                          isToday ? "text-emerald-600" : "text-slate-400")}>{day}</div>
                        <div className="space-y-0.5">
                          {dayTasks.slice(0, 2).map(task => (
                            <div key={task.id} onClick={() => openEdit(task)}
                              className={cx(
                                "text-[10px] rounded px-1 py-0.5 truncate cursor-pointer font-medium",
                                task.done ? "bg-emerald-100 text-emerald-700 line-through" :
                                task.priority === "urgent" ? "bg-orange-100 text-orange-700" :
                                isOverdue(task.due_at, task.done) ? "bg-rose-100 text-rose-700" :
                                "bg-blue-100 text-blue-700"
                              )}>
                              {task.priority === "urgent" && !task.done && "🔴 "}{task.title}
                            </div>
                          ))}
                          {dayTasks.length > 2 && (
                            <div className="text-[10px] text-slate-400">+{dayTasks.length - 2} autres</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-blue-200" />À faire</div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-orange-200" />Urgent</div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-rose-200" />En retard</div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-emerald-200" />Terminée</div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded border border-emerald-400" />Aujourd'hui</div>
                </div>
              </div>

            ) : loading ? (
              <SkeletonTasks />
            ) : filtered.length === 0 ? (
              <EmptyState onCreate={openCreate} />
            ) : (

              /* ── Vue Liste ── */
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-1">Statut</div>
                  <div className="col-span-1">Priorité</div>
                  <div className="col-span-3">Tâche</div>
                  <div className="col-span-2">Échéance</div>
                  <div className="col-span-2">Contact / Lead</div>
                  <div className="col-span-2">Assigné à</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {filtered.map(task => (
                  <div key={task.id} className={cx(
                    "grid grid-cols-12 gap-2 px-5 py-3.5 text-sm border-b border-slate-100 last:border-0 items-center hover:bg-slate-50 transition-colors",
                    task.done && "opacity-60",
                    task.priority === "urgent" && !task.done && "bg-orange-50/40"
                  )}>
                    {/* Checkbox done */}
                    <div className="col-span-1">
                      <button onClick={() => toggleDone(task)}
                        className={cx(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          task.done
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 hover:border-emerald-400"
                        )}>
                        {task.done && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                    </div>

                    {/* Priorité toggle */}
                    <div className="col-span-1">
                      <button
                        onClick={() => togglePriority(task)}
                        title={task.priority === "urgent" ? "Marquer comme normal" : "Marquer comme urgent"}
                        className={cx(
                          "rounded-full text-xs px-2 py-0.5 font-medium border transition-colors",
                          task.priority === "urgent"
                            ? "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
                            : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200"
                        )}>
                        {task.priority === "urgent" ? "🔴 Urgent" : "—"}
                      </button>
                    </div>

                    {/* Titre */}
                    <div className="col-span-3">
                      <div className={cx("font-medium text-slate-900", task.done && "line-through text-slate-400")}>
                        {task.title}
                      </div>
                    </div>

                    {/* Échéance */}
                    <div className="col-span-2">
                      {task.due_at ? (
                        <span className={cx(
                          "text-xs rounded-lg px-2 py-1 font-medium",
                          isOverdue(task.due_at, task.done)
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        )}>
                          {formatDate(task.due_at)}
                        </span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </div>

                    {/* Contact / Lead */}
                    <div className="col-span-2 text-xs text-slate-500 truncate">
                      {task.contact_id
                        ? (() => {
                            const c = contacts.find(c => c.id === task.contact_id);
                            return c ? `👤 ${c.first_name} ${c.last_name}` : "—";
                          })()
                        : task.lead_id
                        ? `🎯 ${leads.find(l => l.id === task.lead_id)?.title ?? "Lead"}`
                        : "—"}
                    </div>

                    {/* Assigné */}
                    <div className="col-span-2 text-xs text-slate-500 truncate">
                      {task.assigned_email ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                            {task.assigned_email[0].toUpperCase()}
                          </div>
                          <span className="truncate">{task.assigned_email}</span>
                        </div>
                      ) : "—"}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end gap-1">
                      <button onClick={() => openEdit(task)}
                        className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Modifier">✏️</button>
                      <button onClick={() => onDelete(task.id)}
                        className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Supprimer">🗑</button>
                    </div>
                  </div>
                ))}

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-medium">
                  {filtered.length} tâche{filtered.length > 1 ? "s" : ""}
                  {filtered.filter(t => t.done).length > 0 && (
                    <span className="ml-2 text-emerald-600">
                      · {filtered.filter(t => t.done).length} terminée{filtered.filter(t => t.done).length > 1 ? "s" : ""}
                    </span>
                  )}
                  {filtered.filter(t => isOverdue(t.due_at, t.done)).length > 0 && (
                    <span className="ml-2 text-rose-500">
                      · {filtered.filter(t => isOverdue(t.due_at, t.done)).length} en retard
                    </span>
                  )}
                  {filtered.filter(t => t.priority === "urgent" && !t.done).length > 0 && (
                    <span className="ml-2 text-orange-500">
                      · {filtered.filter(t => t.priority === "urgent" && !t.done).length} urgente{filtered.filter(t => t.priority === "urgent" && !t.done).length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ══ Modal ══ */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? "Modifier la tâche" : "Nouvelle tâche"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Rappel, rendez-vous ou appel à planifier</p>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">

              {/* Titre */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Titre <span className="text-rose-500">*</span>
                </label>
                <input autoFocus
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  value={fTitle} onChange={e => setFTitle(e.target.value)}
                  placeholder="Ex: Appeler Sophie Martin pour suivi..." />
              </div>

              {/* Priorité */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Priorité</label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setFPriority("normal")}
                    className={cx(
                      "flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      fPriority === "normal"
                        ? "border-slate-400 bg-slate-100 text-slate-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    )}>
                    ⚪ Normal
                  </button>
                  <button type="button"
                    onClick={() => setFPriority("urgent")}
                    className={cx(
                      "flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      fPriority === "urgent"
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                    )}>
                    🔴 Urgent
                  </button>
                </div>
              </div>

              {/* Date + Terminée */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Date d'échéance</label>
                  <input type="datetime-local"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={fDueAt} onChange={e => setFDueAt(e.target.value)} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div onClick={() => setFDone(!fDone)}
                      className={cx(
                        "h-5 w-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors",
                        fDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400"
                      )}>
                      {fDone && <span className="text-[10px] font-bold">✓</span>}
                    </div>
                    <span className="text-sm text-slate-700">Déjà terminée</span>
                  </label>
                </div>
              </div>

              {/* Contact + Lead */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Contact lié</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={fContactId} onChange={e => setFContactId(e.target.value)}>
                    <option value="">Aucun</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Lead lié</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={fLeadId} onChange={e => setFLeadId(e.target.value)}>
                    <option value="">Aucun</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </div>
              </div>

              {/* Erreur */}
              {formError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-600">
                  ⚠️ {formError}
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      {editingId ? "Modification..." : "Création..."}
                    </span>
                  ) : editingId ? "Enregistrer" : "Créer la tâche"}
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
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
      <div className="text-4xl mb-3">✅</div>
      <div className="text-lg font-semibold text-slate-800">Aucune tâche</div>
      <div className="mt-1 text-sm text-slate-500">Crée ta première tâche pour suivre tes actions.</div>
      <button onClick={onCreate}
        className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        + Nouvelle tâche
      </button>
    </div>
  );
}

function SkeletonTasks() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 h-10 animate-pulse" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
          <div className="h-5 w-5 rounded-full animate-pulse bg-slate-200 flex-shrink-0" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100 ml-auto" />
          <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}