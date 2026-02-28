"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ─────────────────────────── Types ─────────────────────────── */
type DealStatus = "prospect" | "qualification" | "proposition" | "negociation" | "gagne" | "perdu";

type Deal = {
  id: string;
  title: string;
  description: string | null;
  status: DealStatus;
  amount: number;
  probability: number;
  weighted_amount: number;
  expected_close_date: string | null;
  contact_id: string | null;
  company_id: string | null;
  assigned_to: string | null;
  first_name?: string | null;
  last_name?: string | null;
  contact_email?: string | null;
  company_name?: string | null;
  assigned_first_name?: string | null;
  assigned_last_name?: string | null;
};

type Stats = {
  summary: {
    total_deals: number;
    total_value: number;
    weighted_value: number;
    won_value: number;
    active_deals: number;
  };
  by_status: { status: DealStatus; count: number; total: number }[];
};

type Contact = { id: string; first_name: string; last_name: string };
type Company = { id: string; name: string };
type User = { id: string; first_name: string; last_name: string };

/* ─────────────────────────── Constants ─────────────────────────── */
const STATUS_LABELS: Record<DealStatus, string> = {
  prospect: "Prospect",
  qualification: "Qualification",
  proposition: "Proposition",
  negociation: "Négociation",
  gagne: "Gagné",
  perdu: "Perdu",
};

const STATUS_COLORS: Record<DealStatus, string> = {
  prospect: "bg-slate-100 text-slate-700",
  qualification: "bg-amber-100 text-amber-700",
  proposition: "bg-blue-100 text-blue-700",
  negociation: "bg-purple-100 text-purple-700",
  gagne: "bg-emerald-100 text-emerald-700",
  perdu: "bg-rose-100 text-rose-700",
};

const PROBA_BAR_COLORS: Record<DealStatus, string> = {
  prospect: "bg-slate-400",
  qualification: "bg-amber-400",
  proposition: "bg-blue-400",
  negociation: "bg-purple-500",
  gagne: "bg-emerald-500",
  perdu: "bg-rose-400",
};

/* ─────────────────────────── Helpers ─────────────────────────── */
function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(Math.round(n));
}

/* ═══════════════════════════ Page ═══════════════════════════ */
export default function DealsPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  /* ── State ── */
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── Filters ── */
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [view, setView] = useState<"list" | "pipeline">("list");

  /* ── Modal ── */
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ── Form fields ── */
  const [fTitle, setFTitle] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fStatus, setFStatus] = useState<DealStatus>("prospect");
  const [fAmount, setFAmount] = useState("");
  const [fContactId, setFContactId] = useState("");
  const [fCompanyId, setFCompanyId] = useState("");
  const [fAssignedTo, setFAssignedTo] = useState("");
  const [fCloseDate, setFCloseDate] = useState("");

  /* ─────────────── Auth ─────────────── */
  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  /* ─────────────── Fetch ─────────────── */
  async function loadStats() {
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/deals/stats`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }

  async function loadDeals() {
    setError(null); setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterUser !== "all") params.set("assigned_to", filterUser);

      const res = await fetch(`${API}/deals?${params}`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setDeals(Array.isArray(data) ? data : []);
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
      const [rc, rco, ru] = await Promise.all([
        fetch(`${API}/contacts`, { headers }),
        fetch(`${API}/companies`, { headers }),
        fetch(`${API}/users`, { headers }),
      ]);
      if (rc.ok) setContacts(await rc.json());
      if (rco.ok) setCompanies(await rco.json());
      if (ru.ok) setUsers(await ru.json());
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadStats();
    loadDeals();
    loadRelations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  /* ─────────────── Modal helpers ─────────────── */
  function openCreate() {
    setError(null); setEditingId(null);
    setFTitle(""); setFDescription(""); setFStatus("prospect");
    setFAmount(""); setFContactId(""); setFCompanyId("");
    setFAssignedTo(""); setFCloseDate("");
    setOpen(true);
  }

  function openEdit(d: Deal) {
    setError(null); setEditingId(d.id);
    setFTitle(d.title);
    setFDescription(d.description ?? "");
    setFStatus(d.status);
    setFAmount(String(d.amount));
    setFContactId(d.contact_id ?? "");
    setFCompanyId(d.company_id ?? "");
    setFAssignedTo(d.assigned_to ?? "");
    setFCloseDate(d.expected_close_date ? d.expected_close_date.slice(0, 10) : "");
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
      const url = `${API}/deals${isEdit ? `/${editingId}` : ""}`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          title: fTitle.trim(),
          description: fDescription.trim() || null,
          status: fStatus,
          amount: parseFloat(fAmount) || 0,
          contact_id: fContactId || null,
          company_id: fCompanyId || null,
          assigned_to: fAssignedTo || null,
          expected_close_date: fCloseDate || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setOpen(false);
      await Promise.all([loadDeals(), loadStats()]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function onStatusChange(id: string, status: DealStatus) {
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/deals/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      await Promise.all([loadDeals(), loadStats()]);
    } catch { /* silent */ }
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce deal ?")) return;
    const t = getToken(); if (!t) return;
    try {
      await fetch(`${API}/deals/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      setDeals(prev => prev.filter(d => d.id !== id));
      loadStats();
    } catch { /* silent */ }
  }

  /* ─────────────── Pipeline grouping ─────────────── */
  const grouped = useMemo(() => {
    const g: Record<DealStatus, Deal[]> = {
      prospect: [], qualification: [], proposition: [],
      negociation: [], gagne: [], perdu: [],
    };
    deals.forEach(d => g[d.status]?.push(d));
    return g;
  }, [deals]);

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
              <SidebarItem active label="Deals" onClick={() => router.push("/deals")} />
              <SidebarItem label="Pipeline"    onClick={() => router.push("/pipeline")} />
              <SidebarItem label="Tâches"      onClick={() => router.push("/tasks")} />
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
            <div className="mx-auto max-w-7xl px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold">Deals</h1>
                  <p className="text-sm text-slate-500">Gérez votre pipeline commercial</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => { loadDeals(); loadStats(); }}
                    title="Rafraîchir"
                  >⟳</button>
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                    onClick={openCreate}
                  >+ Nouveau deal</button>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex items-center gap-2 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-slate-300">
                  <span className="text-slate-400">🔎</span>
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Rechercher un deal..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loadDeals()}
                  />
                </div>

                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="all">Toutes les étapes</option>
                  {(Object.keys(STATUS_LABELS) as DealStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>

                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                >
                  <option value="all">Tous les commerciaux</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>

                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={loadDeals}
                >Filtrer</button>

                {/* Vue toggle */}
                <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setView("list")}
                    className={classNames("px-3 py-2 text-sm", view === "list" ? "bg-slate-100 font-medium" : "hover:bg-slate-50")}
                  >≡ Liste</button>
                  <button
                    onClick={() => setView("pipeline")}
                    className={classNames("px-3 py-2 text-sm border-l border-slate-200", view === "pipeline" ? "bg-slate-100 font-medium" : "hover:bg-slate-50")}
                  >⬛ Pipeline</button>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">

            {/* ── Stats cards ── */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon="◎"
                  iconColor="text-emerald-600"
                  label="Valeur totale"
                  value={`${fmt(stats.summary.total_value)} €`}
                  sub={`${stats.summary.total_deals} deals`}
                />
                <StatCard
                  icon="%"
                  iconColor="text-amber-500"
                  label="Valeur pondérée"
                  value={`${fmt(stats.summary.weighted_value)} €`}
                  sub="Selon probabilités"
                />
                <StatCard
                  icon="🏆"
                  iconColor="text-emerald-600"
                  label="Deals gagnés"
                  value={`${fmt(stats.summary.won_value)} €`}
                  sub={`${stats.by_status.find(s => s.status === "gagne")?.count ?? 0} deals fermés`}
                />
                <StatCard
                  icon="↻"
                  iconColor="text-blue-500"
                  label="En cours"
                  value={String(stats.summary.active_deals)}
                  sub="Deals actifs"
                />
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <div className="font-semibold">Erreur</div>
                <div className="mt-1 text-rose-700">{error}</div>
              </div>
            )}

            {/* ── Content ── */}
            {loading ? (
              <SkeletonDeals />
            ) : deals.length === 0 ? (
              <EmptyState onCreate={openCreate} />
            ) : view === "list" ? (
              /* ══ LIST VIEW ══ */
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  <div className="col-span-3">Deal</div>
                  <div className="col-span-2">Entreprise</div>
                  <div className="col-span-1">Contact</div>
                  <div className="col-span-1 text-right">Valeur</div>
                  <div className="col-span-2">Étape</div>
                  <div className="col-span-1">Proba.</div>
                  <div className="col-span-1">Commercial</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {deals.map(d => (
                  <div key={d.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 items-center">
                    {/* Deal */}
                    <div className="col-span-3">
                      <div className="font-medium text-slate-900 truncate">{d.title}</div>
                      {d.description && <div className="text-xs text-slate-500 truncate">{d.description}</div>}
                    </div>

                    {/* Entreprise */}
                    <div className="col-span-2 text-slate-600 truncate">{d.company_name || "—"}</div>

                    {/* Contact */}
                    <div className="col-span-1 text-slate-600 truncate text-xs">
                      {d.first_name ? `${d.first_name} ${d.last_name}` : "—"}
                    </div>

                    {/* Valeur */}
                    <div className="col-span-1 text-right font-semibold text-slate-800">
                      {fmt(d.amount)} €
                    </div>

                    {/* Étape */}
                    <div className="col-span-2">
                      <select
                        className={classNames(
                          "rounded-lg px-2 py-1 text-xs font-medium border-0 outline-none cursor-pointer",
                          STATUS_COLORS[d.status]
                        )}
                        value={d.status}
                        onChange={e => onStatusChange(d.id, e.target.value as DealStatus)}
                      >
                        {(Object.keys(STATUS_LABELS) as DealStatus[]).map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>

                    {/* Proba */}
                    <div className="col-span-1">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={classNames("h-full rounded-full transition-all", PROBA_BAR_COLORS[d.status])}
                            style={{ width: `${d.probability}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{d.probability}%</span>
                      </div>
                    </div>

                    {/* Commercial */}
                    <div className="col-span-1 text-xs text-slate-600 truncate">
                      {d.assigned_first_name ? `${d.assigned_first_name} ${d.assigned_last_name}` : "—"}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end gap-1">
                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        onClick={() => openEdit(d)}
                      >Modifier</button>
                      <button
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={() => onDelete(d.id)}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ══ PIPELINE VIEW ══ */
              <div className="flex gap-3 overflow-x-auto pb-4">
                {(Object.keys(STATUS_LABELS) as DealStatus[]).map(status => (
                  <div key={status} className="flex-shrink-0 w-64">
                    <div className="mb-3 flex items-center justify-between">
                      <span className={classNames("rounded-lg px-2 py-1 text-xs font-semibold", STATUS_COLORS[status])}>
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="text-xs text-slate-500">{grouped[status].length} deal{grouped[status].length > 1 ? "s" : ""}</span>
                    </div>

                    <div className="space-y-2">
                      {grouped[status].length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                          Aucun deal
                        </div>
                      ) : grouped[status].map(d => (
                        <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                          <div className="font-medium text-sm text-slate-900 leading-snug">{d.title}</div>
                          {d.description && <div className="mt-1 text-xs text-slate-500 truncate">{d.description}</div>}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-800">{fmt(d.amount)} €</span>
                            <span className="text-xs text-slate-400">{d.probability}%</span>
                          </div>
                          {d.company_name && (
                            <div className="mt-1 text-xs text-slate-500">🏢 {d.company_name}</div>
                          )}
                          {d.assigned_first_name && (
                            <div className="mt-1 text-xs text-slate-500">👤 {d.assigned_first_name} {d.assigned_last_name}</div>
                          )}
                          <div className="mt-2 flex gap-1 pt-2 border-t border-slate-100">
                            <button
                              className="flex-1 rounded-lg border border-slate-200 py-1 text-xs hover:bg-slate-50"
                              onClick={() => openEdit(d)}
                            >Modifier</button>
                            <button
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                              onClick={() => onDelete(d.id)}
                            >✕</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total colonne */}
                    {grouped[status].length > 0 && (
                      <div className="mt-2 text-xs text-slate-500 text-right">
                        Total : {fmt(grouped[status].reduce((s, d) => s + d.amount, 0))} €
                      </div>
                    )}
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
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <div className="text-lg font-semibold">{editingId ? "Modifier le deal" : "Nouveau deal"}</div>
                <div className="text-sm text-slate-500">Renseigne les informations commerciales</div>
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
                  placeholder="Ex: Formation SEO Premium"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300 min-h-[70px]"
                  value={fDescription}
                  onChange={e => setFDescription(e.target.value)}
                  placeholder="Contexte du deal..."
                />
              </div>

              {/* Statut + Montant */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Étape</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                    value={fStatus}
                    onChange={e => setFStatus(e.target.value as DealStatus)}
                  >
                    {(Object.keys(STATUS_LABELS) as DealStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Montant (€)</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                    value={fAmount}
                    onChange={e => setFAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Contact + Entreprise */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Contact</label>
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
                  <label className="text-sm font-medium">Entreprise</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                    value={fCompanyId}
                    onChange={e => setFCompanyId(e.target.value)}
                  >
                    <option value="">Aucune</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Commercial + Date clôture */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Commercial</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                    value={fAssignedTo}
                    onChange={e => setFAssignedTo(e.target.value)}
                  >
                    <option value="">Non assigné</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Date de clôture</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                    value={fCloseDate}
                    onChange={e => setFCloseDate(e.target.value)}
                  />
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

function StatCard({ icon, iconColor, label, value, sub }: {
  icon: string; iconColor: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={classNames("text-lg", iconColor)}>{icon}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center">
      <div className="text-4xl">💼</div>
      <div className="mt-3 text-lg font-semibold">Aucun deal</div>
      <div className="mt-1 text-sm text-slate-500">Crée ton premier deal et suis ton pipeline commercial.</div>
      <button
        onClick={onCreate}
        className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >+ Nouveau deal</button>
    </div>
  );
}

function SkeletonDeals() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
        Chargement...
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-slate-100">
          <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-80 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
