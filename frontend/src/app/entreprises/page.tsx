"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Company = {
  id: string;
  name: string;
  website: string | null;
  city: string | null;
  sector: string | null;
  phone: string | null;
  size: string | null;
  annual_revenue: number | null;
  contacts_count?: number;
  created_at?: string;
};

type SortKey = "name" | "city" | "sector" | "size";
type SortDir = "asc" | "desc";

function cx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

const SECTOR_OPTIONS = [
  "Technologie", "Finance", "Santé", "Commerce", "Industrie",
  "Immobilier", "Éducation", "Conseil", "Médias", "Autre",
];

const SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "500+"];

const AVATAR_COLORS = [
  "bg-emerald-500","bg-blue-500","bg-violet-500",
  "bg-amber-500","bg-rose-500","bg-indigo-500","bg-teal-500",
];
function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export default function EntreprisesPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [companies,  setCompanies]  = useState<Company[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // Filtres
  const [query,      setQuery]      = useState("");
  const [filterSect, setFilterSect] = useState("all");
  const [filterSize, setFilterSize] = useState("all");

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Sélection multiple
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modal
  const [open,      setOpen]      = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fName,     setFName]     = useState("");
  const [fWebsite,  setFWebsite]  = useState("");
  const [fCity,     setFCity]     = useState("");
  const [fSector,   setFSector]   = useState("");
  const [fPhone,    setFPhone]    = useState("");
  const [fSize,     setFSize]     = useState("");
  const [fRevenue,  setFRevenue]  = useState("");
  const [formError, setFormError] = useState("");

  // Confirm delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function loadCompanies() {
    setError(null); setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const res  = await fetch(`${API}/companies`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erreur chargement");
      setCompanies(Array.isArray(data) ? data : []);
      setSelected(new Set());
    } catch (e: any) { setError(e?.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Tri
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }
  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-emerald-500 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  // Filtres + tri
  const sorted = useMemo(() => {
    let out = companies.filter(c => {
      const q = query.toLowerCase();
      const match = !q || [c.name, c.city ?? "", c.sector ?? ""].join(" ").toLowerCase().includes(q);
      const matchS = filterSect === "all" || c.sector === filterSect;
      const matchZ = filterSize === "all" || c.size === filterSize;
      return match && matchS && matchZ;
    });
    return out.sort((a, b) => {
      const va = (a[sortKey] ?? "").toString().toLowerCase();
      const vb = (b[sortKey] ?? "").toString().toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [companies, query, filterSect, filterSize, sortKey, sortDir]);

  // Sélection
  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(selected.size === sorted.length ? new Set() : new Set(sorted.map(c => c.id)));
  }
  async function deleteSelected() {
    if (!confirm(`Supprimer ${selected.size} entreprise(s) ?`)) return;
    const t = getToken(); if (!t) return;
    await Promise.all([...selected].map(id =>
      fetch(`${API}/companies/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } })
    ));
    setCompanies(prev => prev.filter(c => !selected.has(c.id)));
    setSelected(new Set());
  }

  // Export CSV
  function exportCSV() {
    const rows = [
      ["Nom", "Secteur", "Ville", "Taille", "Téléphone", "Site web"],
      ...sorted.map(c => [c.name, c.sector ?? "", c.city ?? "", c.size ?? "", c.phone ?? "", c.website ?? ""]),
    ];
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "entreprises.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // Modal
  function openCreate() {
    setFormError(""); setEditingId(null);
    setFName(""); setFWebsite(""); setFCity(""); setFSector("");
    setFPhone(""); setFSize(""); setFRevenue("");
    setOpen(true);
  }
  function openEdit(c: Company, e?: React.MouseEvent) {
    e?.stopPropagation();
    setFormError(""); setEditingId(c.id);
    setFName(c.name ?? ""); setFWebsite(c.website ?? "");
    setFCity(c.city ?? ""); setFSector(c.sector ?? "");
    setFPhone(c.phone ?? ""); setFSize(c.size ?? "");
    setFRevenue(c.annual_revenue ? String(c.annual_revenue) : "");
    setOpen(true);
  }
  function closeModal() { setOpen(false); setEditingId(null); setFormError(""); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    const t = getToken(); if (!t) return;
    if (!fName.trim()) { setFormError("Le nom est obligatoire"); return; }
    setSaving(true);
    try {
      const isEdit = !!editingId;
      const res = await fetch(`${API}/companies${isEdit ? `/${editingId}` : ""}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: fName.trim(), website: fWebsite.trim() || null,
          city: fCity.trim() || null, sector: fSector || null,
          phone: fPhone.trim() || null, size: fSize || null,
          annual_revenue: fRevenue ? Number(fRevenue) : null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erreur");
      closeModal();
      if (isEdit) setCompanies(prev => prev.map(c => c.id === editingId ? { ...c, ...data } : c));
      else setCompanies(prev => [data, ...prev]);
    } catch (e: any) { setFormError(e?.message); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const t = getToken(); if (!t) return;
    try {
      await fetch(`${API}/companies/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      setCompanies(prev => prev.filter(c => c.id !== id));
      setDeletingId(null);
    } catch (e: any) { setError(e?.message); }
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
                { label: "Dashboard", path: "/dashboard", icon: "📊" },
                { label: "Contacts",  path: "/contacts",  icon: "👤" },
                { label: "Leads",     path: "/leads",     icon: "🎯" },
                { label: "Deals",     path: "/deals",     icon: "💼" },
                { label: "Pipeline",  path: "/pipeline",  icon: "📈" },
                { label: "Tâches",    path: "/tasks",     icon: "✅" },
              ].map(item => (
                <button key={item.path} onClick={() => router.push(item.path)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-600 hover:bg-slate-50">
                  <span>{item.icon}</span><span>{item.label}</span>
                </button>
              ))}
              <div className="pt-3 mt-3 border-t border-slate-100">
                <button onClick={() => router.push("/entreprises")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left bg-emerald-50 text-emerald-700 font-medium">
                  <span>🏢</span><span>Entreprises</span>
                </button>
                <button onClick={() => router.push("/settings")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-600 hover:bg-slate-50 mt-0.5">
                  <span>⚙️</span><span>Paramètres</span>
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">

          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">🏢 Entreprises</h1>
                  <p className="text-sm text-slate-500">Gérez vos entreprises et partenaires</p>
                </div>

                {/* KPIs */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{companies.length}</div>
                    <div className="text-xs text-slate-400">Total</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{sorted.length}</div>
                    <div className="text-xs text-slate-400">Affichées</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={exportCSV}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    title="Exporter CSV">⬇ CSV</button>
                  <button onClick={openCreate}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    + Nouvelle entreprise
                  </button>
                  <button onClick={loadCompanies}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    title="Rafraîchir">⟳</button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-400">
                  <span className="text-slate-400 text-sm">🔎</span>
                  <input className="w-full bg-transparent text-sm outline-none"
                    placeholder="Rechercher une entreprise..."
                    value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <select value={filterSect} onChange={e => setFilterSect(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                  <option value="all">Tous les secteurs</option>
                  {SECTOR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterSize} onChange={e => setFilterSize(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                  <option value="all">Toutes les tailles</option>
                  {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {selected.size > 0 && (
                  <div className="flex items-center gap-2 ml-auto rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
                    <span className="text-xs font-medium text-rose-700">{selected.size} sélectionnée(s)</span>
                    <button onClick={deleteSelected}
                      className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-medium text-white hover:bg-rose-600">
                      🗑 Supprimer
                    </button>
                    <button onClick={() => setSelected(new Set())} className="text-xs text-rose-400 hover:text-rose-600">✕</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-6">
            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                ⚠️ {error}
              </div>
            )}

            {loading ? <SkeletonTable /> : sorted.length === 0 ? (
              <EmptyState onCreate={openCreate} />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {/* Header triable */}
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-1 flex items-center">
                    <input type="checkbox"
                      checked={selected.size === sorted.length && sorted.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer" />
                  </div>
                  <div className="col-span-3 cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort("name")}>
                    Entreprise <SortIcon k="name" />
                  </div>
                  <div className="col-span-2 cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort("sector")}>
                    Secteur <SortIcon k="sector" />
                  </div>
                  <div className="col-span-2 cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort("city")}>
                    Ville <SortIcon k="city" />
                  </div>
                  <div className="col-span-1 cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort("size")}>
                    Taille <SortIcon k="size" />
                  </div>
                  <div className="col-span-1">Contacts</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {sorted.map(c => (
                  <div key={c.id}
                    onClick={() => router.push(`/entreprises/${c.id}`)}
                    className={cx(
                      "grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50 transition-colors cursor-pointer",
                      selected.has(c.id) && "bg-emerald-50/50"
                    )}>

                    {/* Checkbox */}
                    <div className="col-span-1" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer" />
                    </div>

                    {/* Nom + logo */}
                    <div className="col-span-3 flex items-center gap-2.5">
                      <div className={cx("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0", avatarColor(c.id))}>
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{c.name}</div>
                        {c.website && (
                          <a href={c.website} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-blue-500 hover:underline truncate block">
                            {c.website.replace(/^https?:\/\//, "")}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Secteur */}
                    <div className="col-span-2 text-xs text-slate-500 truncate">
                      {c.sector ? (
                        <span className="rounded-lg bg-slate-100 px-2 py-1 font-medium">{c.sector}</span>
                      ) : "—"}
                    </div>

                    {/* Ville */}
                    <div className="col-span-2 text-xs text-slate-500 truncate">
                      {c.city ? `📍 ${c.city}` : "—"}
                    </div>

                    {/* Taille */}
                    <div className="col-span-1 text-xs text-slate-500">
                      {c.size ? (
                        <span className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">{c.size}</span>
                      ) : "—"}
                    </div>

                    {/* Contacts */}
                    <div className="col-span-1 text-xs text-slate-500">
                      {c.contacts_count !== undefined ? (
                        <span className="flex items-center gap-1">
                          <span>👤</span> {c.contacts_count}
                        </span>
                      ) : "—"}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={e => openEdit(c, e)}
                        className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">✏️</button>
                      {deletingId === c.id ? (
                        <div className="flex gap-1">
                          <button onClick={e => { e.stopPropagation(); setDeletingId(null); }}
                            className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Annuler</button>
                          <button onClick={e => onDelete(c.id, e)}
                            className="rounded-lg px-2 py-1 text-xs text-white bg-rose-500 hover:bg-rose-600">Confirmer</button>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setDeletingId(c.id); }}
                          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">🗑</button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">{sorted.length} entreprise{sorted.length > 1 ? "s" : ""}</span>
                  {selected.size > 0 && (
                    <span className="text-emerald-600 font-medium">{selected.size} sélectionnée{selected.size > 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? "Modifier l'entreprise" : "Nouvelle entreprise"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Renseigne les informations principales</p>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Nom <span className="text-rose-500">*</span></label>
                <input autoFocus className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  value={fName} onChange={e => setFName(e.target.value)} required placeholder="Ex: Acme Corp" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Site web</label>
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={fWebsite} onChange={e => setFWebsite(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Téléphone</label>
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="01 23 45 67 89" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Ville</label>
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={fCity} onChange={e => setFCity(e.target.value)} placeholder="Ex: Paris" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Secteur</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={fSector} onChange={e => setFSector(e.target.value)}>
                    <option value="">— Choisir —</option>
                    {SECTOR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Taille</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={fSize} onChange={e => setFSize(e.target.value)}>
                    <option value="">— Choisir —</option>
                    {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">CA Annuel (€)</label>
                  <input type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={fRevenue} onChange={e => setFRevenue(e.target.value)} placeholder="Ex: 500000" />
                </div>
              </div>

              {formError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-600">⚠️ {formError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      {editingId ? "Modification..." : "Création..."}
                    </span>
                  ) : editingId ? "Enregistrer" : "Créer l'entreprise"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
      <div className="text-4xl mb-3">🏢</div>
      <div className="text-lg font-semibold text-slate-800">Aucune entreprise</div>
      <div className="mt-1 text-sm text-slate-500">Commence par créer ta première entreprise.</div>
      <button onClick={onCreate}
        className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        + Nouvelle entreprise
      </button>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 h-10 animate-pulse" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="h-4 w-4 animate-pulse rounded bg-slate-200 flex-shrink-0" />
          <div className="h-8 w-8 rounded-lg animate-pulse bg-slate-200 flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}