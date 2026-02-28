"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import React from "react";

const API = process.env.NEXT_PUBLIC_API_URL!;

// ─── Types ────────────────────────────────────────────────────────────────────
type LeadStatus =
  | "nouveau"
  | "en_cours"
  | "converti"
  | "perdu";

interface Lead {
  id: string;
  title: string;
  status: LeadStatus;
  source: string | null;
  value_eur: number | null;
  contact_id: string | null;
  assigned_to: string | null;
  first_name: string | null;
  last_name: string | null;
  contact_email: string | null;
  company_name: string | null;
  assigned_email: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface User {
  id: string;
  email: string;
}

interface FormState {
  title: string;
  status: LeadStatus;
  source: string;
  value_eur: string;
  contact_id: string;
  assigned_to: string;
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  nouveau:  { label: "Nouveau",  color: "#3B82F6", bg: "#EFF6FF", dot: "#3B82F6" },
  en_cours: { label: "En cours", color: "#F59E0B", bg: "#FFFBEB", dot: "#F59E0B" },
  converti: { label: "Converti", color: "#10B981", bg: "#ECFDF5", dot: "#10B981" },
  perdu:    { label: "Perdu",    color: "#EF4444", bg: "#FEF2F2", dot: "#EF4444" },
};

const ALL_STATUSES: LeadStatus[] = [
  "nouveau",
  "en_cours",
  "converti",
  "perdu",
];

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function formatEur(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("fr-FR") + " €";
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
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

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}30`,
      borderRadius: 20, padding: "2px 10px",
      fontSize: 12, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
}

function Avatar({ email }: { email: string }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: "50%",
      background: "#6366F1", color: "#fff",
      fontSize: 11, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {email[0].toUpperCase()}
    </div>
  );
}

// ─── Modal Nouveau Lead ───────────────────────────────────────────────────────
function LeadModal({ onClose, onSave, contacts, users }: {
  onClose: () => void;
  onSave: (lead: Lead) => void;
  contacts: Contact[];
  users: User[];
}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const [form, setForm] = useState<FormState>({
    title: "", status: "nouveau", source: "", value_eur: "", contact_id: "", assigned_to: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.title.trim()) { setError("Le titre est obligatoire"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          status: form.status,
          source: form.source || null,
          value_eur: form.value_eur ? parseFloat(form.value_eur) : null,
          contact_id: form.contact_id || null,
          assigned_to: form.assigned_to || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      onSave(data as Lead);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <div className="text-lg font-semibold">+ Nouveau lead</div>
            <div className="text-sm text-slate-500">Renseigne les informations du lead</div>
          </div>
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={onClose}>✕</button>
        </div>

        <div className="p-5">
          {error && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Intitulé de la formation *</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                value={form.title} onChange={handle("title")} placeholder="Ex: Formation SEO Avancé"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Statut</label>
                <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300" value={form.status} onChange={handle("status")}>
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Source du lead</label>
                <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300" value={form.source} onChange={handle("source")}>
                  <option value="">— Source —</option>
                  {["Site web", "LinkedIn", "Référence", "Facebook", "Google Ads", "Salon", "Email", "Téléphone"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Valeur estimée (€)</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                  type="number" value={form.value_eur} onChange={handle("value_eur")} placeholder="Ex: 4500"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contact associé</label>
                <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300" value={form.contact_id} onChange={handle("contact_id")}>
                  <option value="">— Aucun contact —</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Commercial assigné</label>
              <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300" value={form.assigned_to} onChange={handle("assigned_to")}>
                <option value="">— Non assigné —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={onClose}>Annuler</button>
            <button
              onClick={submit} disabled={loading}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "Enregistrement..." : "Créer le lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ lead, onStatusChange, onDelete }: {
  lead: Lead;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 leading-snug pr-2">{lead.title}</p>
        <div className="relative flex-shrink-0">
          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">⋮</button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              {ALL_STATUSES.filter((s) => s !== lead.status).map((s) => (
                <button key={s} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => { onStatusChange(lead.id, s); setMenuOpen(false); }}>
                  → {STATUS_CONFIG[s].label}
                </button>
              ))}
              <hr className="my-1 border-slate-100" />
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                onClick={() => { onDelete(lead.id); setMenuOpen(false); }}>
                🗑 Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {lead.company_name && <div className="text-xs text-slate-500">🏢 {lead.company_name}</div>}
        {(lead.first_name || lead.last_name) && <div className="text-xs text-slate-500">👤 {lead.first_name} {lead.last_name}</div>}
        {lead.source && <div className="text-xs text-slate-400">📌 {lead.source}</div>}
        {lead.value_eur != null && <div className="text-xs font-bold text-emerald-600">💶 {formatEur(lead.value_eur)}</div>}
      </div>

      {lead.assigned_email && (
        <div className="mt-3 flex items-center gap-2">
          <Avatar email={lead.assigned_email} />
          <span className="text-xs text-slate-500">{lead.assigned_email}</span>
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({ status, leads, onStatusChange, onDelete }: {
  status: LeadStatus;
  leads: Lead[];
  onStatusChange: (id: string, status: LeadStatus) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const total = leads.reduce((s, l) => s + (Number(l.value_eur) || 0), 0);
  return (
    <div className="min-w-[240px] flex-1 rounded-2xl bg-slate-100 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
          <span className="text-sm font-bold text-slate-800">{cfg.label}</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">{leads.length}</span>
        </div>
        {total > 0 && <span className="text-xs font-semibold text-slate-500">{formatEur(total)}</span>}
      </div>
      <div className="space-y-3">
        {leads.map((l) => <KanbanCard key={l.id} lead={l} onStatusChange={onStatusChange} onDelete={onDelete} />)}
        {leads.length === 0 && <div className="py-6 text-center text-xs text-slate-400">Aucun lead</div>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"kanban" | "list">("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | LeadStatus>("all");
  const [filterUser, setFilterUser] = useState("all");
  const [showModal, setShowModal] = useState(false);

  function requireToken(): string | null {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  const fetchLeads = useCallback(async () => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!t) return;
    try {
      const r = await fetch(`${API}/leads`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await r.json();
      setLeads(Array.isArray(data) ? (data as Lead[]) : []);
    } catch (err: unknown) {
      setError("Impossible de charger les leads : " + (err instanceof Error ? err.message : ""));
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!t) return;
    try {
      const r = await fetch(`${API}/contacts`, { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) { const d = await r.json(); setContacts(Array.isArray(d) ? d : []); }
    } catch { /* silencieux */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!t) return;
    try {
      const r = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) { const d = await r.json(); setUsers(Array.isArray(d) ? d : []); }
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    Promise.all([fetchLeads(), fetchContacts(), fetchUsers()]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleStatusChange(id: string, status: LeadStatus) {
    const t = requireToken(); if (!t) return;
    try {
      const r = await fetch(`${API}/leads/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch (err: unknown) { alert("Erreur : " + (err instanceof Error ? err.message : "")); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce lead ?")) return;
    const t = requireToken(); if (!t) return;
    try {
      await fetch(`${API}/leads/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err: unknown) { alert("Erreur : " + (err instanceof Error ? err.message : "")); }
  }

  function handleSave(newLead: Lead) {
    setLeads((prev) => [newLead, ...prev]);
  }

  const filtered = useMemo(() => leads.filter((l) => {
    const q = search.toLowerCase();
    const matchQ = !q
      || l.title?.toLowerCase().includes(q)
      || l.company_name?.toLowerCase().includes(q)
      || l.first_name?.toLowerCase().includes(q)
      || l.last_name?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchUser = filterUser === "all" || l.assigned_email === filterUser;
    return matchQ && matchStatus && matchUser;
  }), [leads, search, filterStatus, filterUser]);

 const byStatus: Record<LeadStatus, Lead[]> = {
  nouveau: [],
  en_cours: [],
  converti: [],
  perdu: [],
};
  filtered.forEach((l) => { if (byStatus[l.status]) byStatus[l.status].push(l); else byStatus["nouveau"].push(l); });

 const kpis = [
  { label: "Total leads", value: filtered.length, dot: "bg-slate-900" },
  { label: "Nouveau",    value: filtered.filter((l) => l.status === "nouveau").length, dot: "bg-blue-500" },
  { label: "En cours",   value: filtered.filter((l) => l.status === "en_cours").length, dot: "bg-amber-500" },
  { label: "Converti",   value: filtered.filter((l) => l.status === "converti").length, dot: "bg-emerald-500" },
  { label: "Perdu",      value: filtered.filter((l) => l.status === "perdu").length, dot: "bg-rose-500" },
];

  const uniqueUsers = [...new Set(leads.filter((l) => l.assigned_email).map((l) => l.assigned_email as string))];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">

        {/* ── Sidebar (identique à EntreprisesPage) */}
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
              <SidebarItem label="Leads" active onClick={() => router.push("/leads")} />
              <SidebarItem label="Pipeline"    onClick={() => router.push("/pipeline")} />
              <SidebarItem label="Tâches"      onClick={() => router.push("/tasks")} />
              <div className="mt-4 border-t border-slate-300 pt-4">
                <SidebarItem label="Paramètres" onClick={() => router.push("/settings")} />
              </div>
            </nav>
          </div>

          <div className="p-4">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="text-sm font-semibold">Besoin d&apos;aide ?</div>
              <div className="mt-1 text-xs text-slate-600">Consultez notre guide d&apos;utilisation</div>
              <button className="mt-3 w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Voir le guide
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main content */}
        <main className="flex-1">

          {/* Header sticky */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-full px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold">Leads</h1>
                  <p className="text-sm text-slate-500">Gérez vos opportunités commerciales</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    title="Rafraîchir"
                    onClick={() => { setLoading(true); fetchLeads().finally(() => setLoading(false)); }}
                  >⟳</button>
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                    onClick={() => setShowModal(true)}
                  >+ Nouveau lead</button>
                </div>
              </div>

              {/* KPIs */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                {kpis.map((k) => (
                  <div key={k.label} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${k.dot}`} />
                    <span className="text-slate-500">{k.label}</span>
                    <span className="font-semibold text-slate-900">{k.value}</span>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-col gap-3 md:flex-row">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-slate-300">
                      <span className="text-slate-400">🔎</span>
                      <input
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="Rechercher un lead..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none hover:bg-slate-50 focus:border-slate-300"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as "all" | LeadStatus)}
                    >
                      <option value="all">Tous les statuts</option>
                      {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none hover:bg-slate-50 focus:border-slate-300"
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                    >
                      <option value="all">Tous les commerciaux</option>
                      {uniqueUsers.map((email) => <option key={email} value={email}>{email}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    className={classNames("rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50", view === "list" ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-900" : "bg-white text-slate-800")}
                    onClick={() => setView("list")}
                  >☰ Liste</button>
                  <button
                    className={classNames("rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50", view === "kanban" ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-900" : "bg-white text-slate-800")}
                    onClick={() => setView("kanban")}
                  >⊞ Kanban</button>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                {filtered.length} lead{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="mx-auto max-w-full px-6 py-6">

            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <div className="font-semibold">Erreur</div>
                <div className="mt-1 text-rose-700">{error}</div>
                <button className="mt-3 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700" onClick={fetchLeads}>
                  Réessayer
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <div className="text-center">
                  <div className="text-3xl">⟳</div>
                  <p className="mt-3 text-sm">Chargement des leads...</p>
                </div>
              </div>

            ) : view === "kanban" ? (
             <div className="flex w-full gap-4 overflow-x-auto pb-6">
                {ALL_STATUSES.map((s) => (
                  <KanbanColumn key={s} status={s} leads={byStatus[s]} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                ))}
              </div>

            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  <div className="col-span-3">Formation</div>
                  <div className="col-span-2">Entreprise</div>
                  <div className="col-span-2">Contact</div>
                  <div className="col-span-1">Statut</div>
                  <div className="col-span-1">Source</div>
                  <div className="col-span-1">Valeur</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">Aucun lead trouvé</div>
                ) : filtered.map((l) => (
                  <div key={l.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <div className="col-span-3 font-semibold text-slate-900">{l.title}</div>
                    <div className="col-span-2 text-slate-600">{l.company_name ?? "—"}</div>
                    <div className="col-span-2 text-slate-600">{l.first_name ? `${l.first_name} ${l.last_name}` : "—"}</div>
                    <div className="col-span-1"><Badge status={l.status} /></div>
                    <div className="col-span-1">
                      {l.source
                        ? <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs">{l.source}</span>
                        : <span className="text-slate-300">—</span>}
                    </div>
                    <div className="col-span-1 font-bold text-emerald-600 text-xs">{formatEur(l.value_eur)}</div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <select
                        className="rounded-xl border border-slate-200 px-2 py-1 text-xs outline-none hover:bg-slate-50"
                        value={l.status}
                        onChange={(e) => handleStatusChange(l.id, e.target.value as LeadStatus)}
                      >
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                      <button
                        className="rounded-xl border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDelete(l.id)}
                      >🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <LeadModal onClose={() => setShowModal(false)} onSave={handleSave} contacts={contacts} users={users} />
      )}
    </div>
  );
}
