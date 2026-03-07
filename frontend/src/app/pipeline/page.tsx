"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type DealStatus = "prospect" | "qualification" | "proposition" | "negociation" | "gagne" | "perdu";

type Deal = {
  id: string;
  title: string;
  description: string | null;
  status: DealStatus;
  amount: number;
  probability: number;
  expected_close_date: string | null;
  contact_id: string | null;
  company_id: string | null;
  assigned_to: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  assigned_first_name?: string | null;
  assigned_last_name?: string | null;
  updated_at: string;
};

type DealForm = {
  title: string;
  description: string;
  status: DealStatus;
  amount: string;
  expected_close_date: string;
};

const STAGES: { status: DealStatus; label: string; color: string }[] = [
  { status: "prospect",      label: "Prospect",      color: "#64748b" },
  { status: "qualification", label: "Qualification", color: "#f59e0b" },
  { status: "proposition",   label: "Proposition",   color: "#3b82f6" },
  { status: "negociation",   label: "Négociation",   color: "#8b5cf6" },
  { status: "gagne",         label: "Gagné ✓",       color: "#10b981" },
  { status: "perdu",         label: "Perdu",         color: "#ef4444" },
];

const STATUS_COLORS: Record<DealStatus, string> = {
  prospect:      "bg-slate-100 text-slate-700",
  qualification: "bg-amber-100 text-amber-700",
  proposition:   "bg-blue-100 text-blue-700",
  negociation:   "bg-purple-100 text-purple-700",
  gagne:         "bg-emerald-100 text-emerald-700",
  perdu:         "bg-rose-100 text-rose-700",
};

const EMPTY_FORM: DealForm = {
  title: "", description: "", status: "prospect", amount: "", expected_close_date: "",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(Math.round(n));
}

function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function cx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function dealToForm(deal: Deal): DealForm {
  return {
    title: deal.title,
    description: deal.description ?? "",
    status: deal.status,
    amount: deal.amount ? String(deal.amount) : "",
    expected_close_date: deal.expected_close_date ? deal.expected_close_date.slice(0, 10) : "",
  };
}

// ─── Modal partagé création / édition ────────────────────────────────────────
function DealModal({
  mode, form, setForm, onSave, onDelete, onClose, saving, deleting, error,
}: {
  mode: "create" | "edit";
  form: DealForm;
  setForm: (f: DealForm) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
  saving: boolean;
  deleting: boolean;
  error: string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {mode === "create" ? "Nouveau deal" : "Modifier le deal"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === "create" ? "Remplissez les informations ci-dessous" : "Modifiez les informations du deal"}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-lg font-bold">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Titre <span className="text-rose-500">*</span>
            </label>
            <input
              autoFocus
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              onKeyDown={e => e.key === "Enter" && onSave()}
              placeholder="Ex : Formation SEO Premium"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Statut</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as DealStatus })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white">
                {STAGES.map(s => <option key={s.status} value={s.status}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Montant (€)</label>
              <input
                type="number" min="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Date de clôture prévue</label>
            <input
              type="date"
              value={form.expected_close_date}
              onChange={e => setForm({ ...form, expected_close_date: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Notes, contexte, remarques..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-600">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {mode === "edit" && onDelete && (
            confirmDelete ? (
              <div className="flex gap-2 flex-1">
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
                <button onClick={onDelete} disabled={deleting}
                  className="flex-1 rounded-xl bg-rose-500 px-3 py-2.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-50 transition-colors">
                  {deleting ? "Suppression..." : "✓ Confirmer"}
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="rounded-xl border border-rose-200 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 transition-colors">
                🗑 Supprimer
              </button>
            )
          )}

          {!confirmDelete && (
            <>
              <button onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={onSave} disabled={saving || !form.title.trim()}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    {mode === "create" ? "Création..." : "Sauvegarde..."}
                  </span>
                ) : mode === "create" ? "Créer le deal" : "Sauvegarder"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PipelinePage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dragOverStatus, setDragOverStatus] = useState<DealStatus | null>(null);
  const draggedId = useRef<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [form, setForm] = useState<DealForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function loadDeals() {
    setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/deals`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) setDeals(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadDeals();
  }, [router]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowCreate(true);
  }

  function openEdit(deal: Deal) {
    setEditDeal(deal);
    setForm(dealToForm(deal));
    setFormError("");
  }

  async function createDeal() {
    if (!form.title.trim()) { setFormError("Le titre est requis."); return; }
    setFormError("");
    setSaving(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          amount: Number(form.amount) || 0,
          expected_close_date: form.expected_close_date || null,
        }),
      });
      if (res.ok) { setShowCreate(false); loadDeals(); }
      else { const e = await res.json(); setFormError(e.error || "Erreur lors de la création."); }
    } catch { setFormError("Erreur réseau."); }
    finally { setSaving(false); }
  }

  async function updateDeal() {
    if (!editDeal) return;
    if (!form.title.trim()) { setFormError("Le titre est requis."); return; }
    setFormError("");
    setSaving(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/deals/${editDeal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          amount: Number(form.amount) || 0,
          expected_close_date: form.expected_close_date || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDeals(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
        setEditDeal(null);
      } else {
        const e = await res.json();
        setFormError(e.error || "Erreur lors de la modification.");
      }
    } catch { setFormError("Erreur réseau."); }
    finally { setSaving(false); }
  }

  async function deleteDeal() {
    if (!editDeal) return;
    setDeleting(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/deals/${editDeal.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setDeals(prev => prev.filter(d => d.id !== editDeal.id));
        setEditDeal(null);
      } else { setFormError("Erreur lors de la suppression."); }
    } catch { setFormError("Erreur réseau."); }
    finally { setDeleting(false); }
  }

  function handleDragStart(e: React.DragEvent, dealId: string) {
    draggedId.current = dealId;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, status: DealStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }

  function handleDragLeave() { setDragOverStatus(null); }

  async function handleDrop(e: React.DragEvent, status: DealStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const id = draggedId.current;
    if (!id) return;
    const deal = deals.find(d => d.id === id);
    if (!deal || deal.status === status) return;
    setDeals(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/deals/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) setDeals(prev => prev.map(d => d.id === id ? { ...d, status: deal.status } : d));
    } catch {
      setDeals(prev => prev.map(d => d.id === id ? { ...d, status: deal.status } : d));
    }
    draggedId.current = null;
  }

  async function onStatusChange(id: string, status: DealStatus) {
    const deal = deals.find(d => d.id === id);
    if (!deal) return;
    setDeals(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/deals/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) setDeals(prev => prev.map(d => d.id === id ? { ...d, status: deal.status } : d));
    } catch {
      setDeals(prev => prev.map(d => d.id === id ? { ...d, status: deal.status } : d));
    }
  }

  const filtered = useMemo(() =>
    filterStatus === "all" ? deals : deals.filter(d => d.status === filterStatus),
  [deals, filterStatus]);

  const grouped = useMemo(() => {
    const g: Record<DealStatus, Deal[]> = {
      prospect: [], qualification: [], proposition: [],
      negociation: [], gagne: [], perdu: [],
    };
    deals.forEach(d => g[d.status]?.push(d));
    return g;
  }, [deals]);

  const totalPipeline = useMemo(() =>
    deals.filter(d => !["gagne", "perdu"].includes(d.status)).reduce((s, d) => s + Number(d.amount || 0), 0),
  [deals]);

  const totalWon = useMemo(() =>
    deals.filter(d => d.status === "gagne").reduce((s, d) => s + Number(d.amount || 0), 0),
  [deals]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">

        

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">📈 Pipeline</h1>
                  <p className="text-sm text-slate-500">Suivez et déplacez vos deals</p>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{fmt(totalPipeline)} €</div>
                    <div className="text-xs text-slate-400">Pipeline actif</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <div className="font-bold text-emerald-600">{fmt(totalWon)} €</div>
                    <div className="text-xs text-slate-400">Deals gagnés</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{deals.length}</div>
                    <div className="text-xs text-slate-400">Total deals</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={openCreate}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    + Nouveau deal
                  </button>
                  <button onClick={loadDeals}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    title="Rafraîchir">⟳</button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                {view === "list" && (
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                    <option value="all">Toutes les étapes</option>
                    {STAGES.map(s => <option key={s.status} value={s.status}>{s.label}</option>)}
                  </select>
                )}
                <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden ml-auto">
                  <button onClick={() => setView("kanban")}
                    className={cx("px-4 py-2 text-sm font-medium transition-colors",
                      view === "kanban" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
                    ⬛ Kanban
                  </button>
                  <button onClick={() => setView("list")}
                    className={cx("px-4 py-2 text-sm font-medium border-l border-slate-200 transition-colors",
                      view === "list" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
                    ≡ Liste
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-x-auto">
            {loading ? (
              view === "kanban" ? <SkeletonKanban /> : <SkeletonList />
            ) : view === "kanban" ? (

              <div className="flex" style={{ minWidth: `${STAGES.length * 272}px` }}>
                {STAGES.map((stage, index) => {
                  const stageDeals = grouped[stage.status];
                  const stageTotal = stageDeals.reduce((s, d) => s + Number(d.amount || 0), 0);
                  const isDragOver = dragOverStatus === stage.status;
                  return (
                    <div key={stage.status} className="flex-shrink-0 w-64 flex flex-col px-3"
                      style={{ borderLeft: index > 0 ? "1px solid #e2e8f0" : "none" }}>
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="text-sm font-semibold text-slate-800 flex-1 truncate">{stage.label}</span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {stageDeals.length}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 pl-5">{fmt(stageTotal)} €</p>
                      </div>
                      <div
                        className="flex-1 space-y-2 min-h-48 rounded-2xl p-2 transition-all duration-150"
                        style={{
                          border: isDragOver ? `2px solid ${stage.color}` : "1px solid #e2e8f0",
                          backgroundColor: isDragOver ? `${stage.color}12` : "#f8fafc",
                        }}
                        onDragOver={e => handleDragOver(e, stage.status)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, stage.status)}
                      >
                        {stageDeals.length === 0 ? (
                          <div className="h-16 flex items-center justify-center text-xs text-slate-400">Déposez ici</div>
                        ) : stageDeals.map(deal => (
                          <KanbanCard key={deal.id} deal={deal} stageColor={stage.color}
                            onDragStart={handleDragStart} onClick={() => openEdit(deal)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            ) : (

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-3">Deal</div>
                  <div className="col-span-2">Entreprise</div>
                  <div className="col-span-2">Étape</div>
                  <div className="col-span-1 text-right">Montant</div>
                  <div className="col-span-1">Probabilité</div>
                  <div className="col-span-1">Commercial</div>
                  <div className="col-span-1">Clôture</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {filtered.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-slate-400">Aucun deal pour cette étape</div>
                ) : filtered.map(deal => {
                  const stage = STAGES.find(s => s.status === deal.status)!;
                  return (
                    <div key={deal.id}
                      className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50 transition-colors">
                      <div className="col-span-3">
                        <div className="text-sm font-medium text-slate-900 truncate">{deal.title}</div>
                        {deal.description && <div className="text-xs text-slate-400 truncate">{deal.description}</div>}
                      </div>
                      <div className="col-span-2 text-xs text-slate-500 truncate">{deal.company_name || "—"}</div>
                      <div className="col-span-2">
                        <select value={deal.status} onChange={e => onStatusChange(deal.id, e.target.value as DealStatus)}
                          className={cx("rounded-lg px-2 py-1 text-xs font-medium border-0 outline-none cursor-pointer w-full", STATUS_COLORS[deal.status])}>
                          {STAGES.map(s => <option key={s.status} value={s.status}>{s.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-1 text-right text-sm font-semibold text-slate-800">
                        {fmt(Number(deal.amount || 0))} €
                      </div>
                      <div className="col-span-1">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${deal.probability}%`, backgroundColor: stage.color }} />
                          </div>
                          <span className="text-xs text-slate-400 w-7 text-right">{deal.probability}%</span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        {deal.assigned_first_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: stage.color }}>
                              {deal.assigned_first_name[0]}
                            </div>
                            <span className="text-xs text-slate-500 truncate">{deal.assigned_first_name}</span>
                          </div>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </div>
                      <div className="col-span-1 text-xs text-slate-400">
                        {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString("fr-FR") : "—"}
                      </div>
                      <div className="col-span-1 text-right">
                        <button onClick={() => openEdit(deal)}
                          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Modifier">✏️</button>
                      </div>
                    </div>
                  );
                })}

                {filtered.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-600">
                    <div className="col-span-3">{filtered.length} deal{filtered.length > 1 ? "s" : ""}</div>
                    <div className="col-span-6" />
                    <div className="col-span-1 text-right">
                      {fmt(filtered.reduce((s, d) => s + Number(d.amount || 0), 0))} €
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal création */}
      {showCreate && (
        <DealModal mode="create" form={form} setForm={setForm}
          onSave={createDeal} onClose={() => setShowCreate(false)}
          saving={saving} deleting={false} error={formError} />
      )}

      {/* Modal édition */}
      {editDeal && (
        <DealModal mode="edit" form={form} setForm={setForm}
          onSave={updateDeal} onDelete={deleteDeal} onClose={() => setEditDeal(null)}
          saving={saving} deleting={deleting} error={formError} />
      )}
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ deal, stageColor, onDragStart, onClick }: {
  deal: Deal;
  stageColor: string;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
}) {
  const days = daysAgo(deal.updated_at);
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, deal.id)}
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-3 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all select-none group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-slate-800 leading-tight flex-1 line-clamp-2">{deal.title}</p>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
          <div className="flex items-center gap-0.5 text-slate-400">
            <span className="text-[10px]">🕐</span>
            <span className="text-[10px] font-mono">{days}j</span>
          </div>
        </div>
      </div>

      {deal.company_name && (
        <p className="text-[10px] text-slate-400 mb-2 truncate">🏢 {deal.company_name}</p>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-slate-800">{fmt(Number(deal.amount || 0))} €</span>
        <div className="flex items-center gap-1.5">
          {deal.assigned_first_name && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: stageColor }}>
              {deal.assigned_first_name[0]}
            </div>
          )}
          <span className="text-[10px] text-slate-400 font-mono">{deal.probability}%</span>
        </div>
      </div>

      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${deal.probability}%`, backgroundColor: stageColor }} />
      </div>

      {deal.expected_close_date && (
        <div className="mt-2 text-[10px] text-slate-400">
          📅 {new Date(deal.expected_close_date).toLocaleDateString("fr-FR")}
        </div>
      )}
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function SkeletonKanban() {
  return (
    <div className="flex gap-4">
      {STAGES.map(s => (
        <div key={s.status} className="flex-shrink-0 w-64">
          <div className="h-5 w-28 animate-pulse rounded bg-slate-200 mb-3" />
          <div className="space-y-2 rounded-2xl border border-slate-200 p-2 min-h-48">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-1 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 h-10 animate-pulse" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100 ml-auto" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}