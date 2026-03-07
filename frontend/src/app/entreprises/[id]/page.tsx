"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

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
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
};

type Deal = {
  id: string;
  title: string;
  amount: number | null;
  status: string;
  expected_close_date: string | null;
};

type Activity = {
  id: string;
  type: "note" | "email" | "appel" | "reunion";
  content: string;
  created_at: string;
};

function cx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

const AVATAR_COLORS = [
  "bg-emerald-500","bg-blue-500","bg-violet-500",
  "bg-amber-500","bg-rose-500","bg-indigo-500",
];
function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function fmt(n: number | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " €";
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const DEAL_COLORS: Record<string, string> = {
  prospect:      "bg-slate-100 text-slate-600",
  qualification: "bg-amber-100 text-amber-700",
  proposition:   "bg-blue-100 text-blue-700",
  negociation:   "bg-purple-100 text-purple-700",
  gagne:         "bg-emerald-100 text-emerald-700",
  perdu:         "bg-rose-100 text-rose-700",
};

const ACTIVITY_ICONS: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  note:    { icon: "📝", color: "text-slate-600",   bg: "bg-slate-100",   label: "Note" },
  email:   { icon: "📧", color: "text-blue-600",    bg: "bg-blue-100",    label: "Email" },
  appel:   { icon: "📞", color: "text-emerald-600", bg: "bg-emerald-100", label: "Appel" },
  reunion: { icon: "📅", color: "text-amber-600",   bg: "bg-amber-100",   label: "Réunion" },
};

export default function EntrepriseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [company,    setCompany]    = useState<Company | null>(null);
  const [contacts,   setContacts]   = useState<Contact[]>([]);
  const [deals,      setDeals]      = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const [activeTab,  setActiveTab]  = useState<"apropos" | "activites">("apropos");
  const [noteText,   setNoteText]   = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Edit inline
  const [editField,  setEditField]  = useState<string | null>(null);
  const [editValue,  setEditValue]  = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    const t = getToken(); if (!t) return;
    const headers = { Authorization: `Bearer ${t}` };
    try {
      const [cr, contr, dr] = await Promise.all([
        fetch(`${API}/companies/${id}`, { headers }),
        fetch(`${API}/contacts?company_id=${id}`, { headers }),
        fetch(`${API}/deals?company_id=${id}`, { headers }),
      ]);
      if (cr.ok) setCompany(await cr.json());
      else throw new Error("Entreprise introuvable");
      if (contr.ok) { const d = await contr.json(); setContacts(Array.isArray(d) ? d : []); }
      if (dr.ok)    { const d = await dr.json();    setDeals(Array.isArray(d) ? d : []); }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]
);

  // Note rapide
  async function submitNote() {
    if (!noteText.trim() || !company) return;
    setSavingNote(true);
    try {
      setActivities(prev => [{
        id: Date.now().toString(), type: "note",
        content: noteText.trim(), created_at: new Date().toISOString(),
      }, ...prev]);
      setNoteText("");
    } finally { setSavingNote(false); }
  }

  // Edit inline
  function startEdit(field: string, value: string | null) {
    setEditField(field); setEditValue(value ?? "");
  }
async function saveEdit() {
  if (!company || !editField) return;
  setSavingEdit(true);
  const t = getToken(); if (!t) return;
  try {
    const updated = { ...company, [editField]: editValue || null };
    const res = await fetch(`${API}/companies/${company.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        name:           updated.name,
        website:        updated.website,
        city:           updated.city,
        sector:         updated.sector,
        phone:          updated.phone,
        size:           updated.size,
        annual_revenue: updated.annual_revenue,
      }),
    });
      if (res.ok) setCompany(prev => prev ? { ...prev, [editField]: editValue || null } : prev);
    } finally { setSavingEdit(false); setEditField(null); }
  }

  function EditableField({ field, label, value, type = "text" }: {
    field: string; label: string; value: string | null; type?: string;
  }) {
    const isEditing = editField === field;
    return (
      <div className="group">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2">
            {field === "sector" || field === "size" ? (
              <select autoFocus
                className="flex-1 rounded-lg border border-emerald-400 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-100 bg-white"
                value={editValue} onChange={e => setEditValue(e.target.value)}>
                {field === "sector" && ["Technologie","Finance","Santé","Commerce","Industrie","Immobilier","Éducation","Conseil","Médias","Autre"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
                {field === "size" && ["1-10","11-50","51-200","201-500","500+"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input autoFocus type={type}
                className="flex-1 rounded-lg border border-emerald-400 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-100"
                value={editValue} onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditField(null); }} />
            )}
            <button onClick={saveEdit} disabled={savingEdit}
              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50">
              {savingEdit ? "..." : "✓"}
            </button>
            <button onClick={() => setEditField(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-h-[28px]">
            <span className={cx("text-sm", value ? "text-slate-800" : "text-slate-300")}>{value || "—"}</span>
            <button onClick={() => startEdit(field, value)}
              className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-emerald-600 transition-all">✏️</button>
          </div>
        )}
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl animate-spin inline-block">⟳</div>
        <p className="mt-3 text-sm text-slate-500">Chargement...</p>
      </div>
    </div>
  );

  if (error || !company) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-slate-600">{error ?? "Entreprise introuvable"}</p>
        <button onClick={() => router.push("/entreprises")}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
          ← Retour aux entreprises
        </button>
      </div>
    </div>
  );

  const totalRevenue = deals.reduce((s, d) => s + Number(d.amount || 0), 0);
  const openDeals    = deals.filter(d => d.status !== "gagne" && d.status !== "perdu").length;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 text-sm">
        <button onClick={() => router.push("/entreprises")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors font-medium">
          ← Entreprises
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-semibold">{company.name}</span>

        <div className="ml-auto flex items-center gap-2">
          {[
            { icon: "📝", label: "Note",    action: () => { setActiveTab("activites"); } },
            { icon: "📧", label: "Email",   action: () => { if (company.website) window.open(`mailto:`, "_blank"); } },
{ icon: "📞", label: "Appel",   action: () => { if (company.phone) window.open(`tel:${company.phone}`, "_self"); } },
            { icon: "✅", label: "Tâche",   action: () => router.push("/tasks") },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-emerald-300 transition-colors">
              <span>{btn.icon}</span><span>{btn.label}</span>
            </button>
          ))}
          <button onClick={() => router.push("/entreprises")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
            ✕ Fermer
          </button>
        </div>
      </div>

      {/* 3 colonnes */}
      <div className="flex h-[calc(100vh-49px)]">

        {/* ══ COLONNE 1 — Infos entreprise ══ */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">

          {/* Avatar + nom */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex flex-col items-center text-center">
              <div className={cx("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-3", avatarColor(company.id))}>
                {company.name[0]?.toUpperCase()}
              </div>
              <h1 className="text-lg font-bold text-slate-900">{company.name}</h1>
              {company.sector && <p className="text-sm text-slate-500 mt-0.5">{company.sector}</p>}
              {company.city && (
                <p className="text-xs text-slate-400 mt-1">📍 {company.city}</p>
              )}
              {company.website && (
                <a href={company.website} target="_blank" rel="noreferrer"
                  className="mt-2 text-xs text-blue-500 hover:underline">
                  {company.website.replace(/^https?:\/\//, "")} ↗
                </a>
              )}
            </div>

            {/* Actions rapides */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => router.push(`/contacts?company_id=${company.id}`)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                👤 Contacts ({contacts.length})
              </button>
              <button onClick={() => router.push("/pipeline")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                💼 Deals ({deals.length})
              </button>
            </div>
          </div>

          {/* Résumé chiffres */}
          <div className="p-5 border-b border-slate-100">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3">Résumé financier</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Deals ouverts", value: openDeals,              color: "text-amber-600" },
                { label: "Deals gagnés",  value: deals.filter(d => d.status === "gagne").length, color: "text-emerald-600" },
                { label: "CA total",      value: fmt(totalRevenue),      color: "text-blue-600",    wide: true },
              ].map((s, i) => (
                <div key={i} className={cx("rounded-xl bg-slate-50 p-2.5 text-center", s.wide && "col-span-2")}>
                  <p className={cx("text-base font-bold", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Propriétaire + infos */}
          <div className="p-5 border-b border-slate-100 space-y-3">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Informations</p>
            {company.phone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>📞</span>
                <a href={`tel:${company.phone}`} className="hover:text-emerald-600 transition-colors">{company.phone}</a>
              </div>
            )}
            {company.size && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>👥</span>
                <span>{company.size} employés</span>
              </div>
            )}
            {company.annual_revenue && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>💰</span>
                <span>{fmt(company.annual_revenue)} / an</span>
              </div>
            )}
          </div>

          {/* Phase cycle de vie */}
          <div className="p-5 border-b border-slate-100">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3">Phase</p>
            <div className="space-y-1.5">
              {[
                { label: "Type",              value: "Prospect" },
                { label: "Phase de vie",      value: "Opportunité" },
                { label: "Dernier contact",   value: fmtDate(company.updated_at) },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="text-slate-700 font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="p-5">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">Système</p>
            <div className="text-xs text-slate-500 space-y-1">
              <p>Créé le <span className="text-slate-700 font-medium">{fmtDate(company.created_at)}</span></p>
              {company.updated_at && (
                <p>Modifié le <span className="text-slate-700 font-medium">{fmtDate(company.updated_at)}</span></p>
              )}
            </div>
          </div>
        </aside>

        {/* ══ COLONNE 2 — À propos / Activités ══ */}
        <div className="flex-1 overflow-y-auto">
          {/* Onglets */}
          <div className="bg-white border-b border-slate-200 px-6 flex items-center sticky top-0 z-10">
            {([
              { id: "apropos",   label: "À propos" },
              { id: "activites", label: "Activités" },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cx(
                  "px-5 py-3.5 text-sm font-medium border-b-2 transition-all -mb-px",
                  activeTab === tab.id
                    ? "border-emerald-500 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-5">
            {activeTab === "apropos" && (
              <>
                {/* Profil entreprise */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800">Profil de l'entreprise</h3>
                    <span className="text-xs text-slate-400">Survolez un champ pour modifier</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <EditableField field="name"           label="Nom de l'entreprise" value={company.name} />
                    <EditableField field="website"        label="Site web"             value={company.website} />
                    <EditableField field="city"           label="Ville"                value={company.city} />
                    <EditableField field="phone"          label="Téléphone"            value={company.phone} />
                    <EditableField field="sector"         label="Secteur d'activité"   value={company.sector} />
                    <EditableField field="size"           label="Taille"               value={company.size} />
                    <EditableField field="annual_revenue" label="CA Annuel (€)"        value={company.annual_revenue ? String(company.annual_revenue) : null} type="number" />
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Notes internes</h3>
                  {company.notes ? (
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-3">
                      {company.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Aucune note pour cette entreprise.</p>
                  )}
                </div>
              </>
            )}

            {activeTab === "activites" && (
              <>
                {/* Zone note */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Ajouter une note</p>
                  <textarea rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
                    placeholder="Écrivez une note sur cette entreprise..."
                    value={noteText} onChange={e => setNoteText(e.target.value)} />
                  <div className="flex justify-end mt-2">
                    <button onClick={submitNote} disabled={!noteText.trim() || savingNote}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
                      {savingNote ? "Enregistrement..." : "💾 Enregistrer"}
                    </button>
                  </div>
                </div>

                {activities.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-sm text-slate-500">Aucune activité enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map(act => {
                      const cfg = ACTIVITY_ICONS[act.type] ?? ACTIVITY_ICONS.note;
                      return (
                        <div key={act.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3">
                          <div className={cx("w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0", cfg.bg)}>
                            {cfg.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cx("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
                              <span className="text-xs text-slate-400">
                                {new Date(act.created_at).toLocaleDateString("fr-FR", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700">{act.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══ COLONNE 3 — Contacts + Deals ══ */}
        <aside className="w-80 flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto">

          {/* Contacts associés */}
          <div className="border-b border-slate-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">👤</span>
                <span className="text-sm font-semibold text-slate-800">Contacts</span>
                <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-bold">{contacts.length}</span>
              </div>
              <button onClick={() => router.push(`/contacts?company_id=${company.id}`)}
                className="text-xs text-emerald-600 hover:underline font-medium">
                Afficher tous ↗
              </button>
            </div>

            <div className="px-4 pb-4 space-y-2">
              {contacts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">Aucun contact associé</p>
                </div>
              ) : contacts.slice(0, 4).map(c => (
                <div key={c.id}
                  onClick={() => router.push(`/contacts/${c.id}`)}
                  className="rounded-xl border border-slate-200 p-3 flex items-center gap-2.5 hover:border-emerald-300 cursor-pointer transition-colors">
                  <div className={cx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0", avatarColor(c.id))}>
                    {c.first_name?.[0]}{c.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{c.first_name} {c.last_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{c.job_title || c.email}</p>
                  </div>
                  <span className="text-slate-300 text-xs">→</span>
                </div>
              ))}
              {contacts.length > 4 && (
                <button onClick={() => router.push(`/contacts?company_id=${company.id}`)}
                  className="w-full text-xs text-slate-400 hover:text-emerald-600 py-1 transition-colors">
                  Voir tous les contacts ({contacts.length}) ↗
                </button>
              )}
            </div>
          </div>

          {/* Deals / Transactions */}
          <div className="border-b border-slate-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">💼</span>
                <span className="text-sm font-semibold text-slate-800">Transactions</span>
                <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-bold">{deals.length}</span>
              </div>
              <button onClick={() => router.push("/pipeline")}
                className="text-xs text-emerald-600 hover:underline font-medium">+ Ajouter</button>
            </div>

            <div className="px-4 pb-4 space-y-2">
              {deals.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">Aucune transaction</p>
                  <button onClick={() => router.push("/pipeline")}
                    className="mt-1 text-xs text-emerald-600 hover:underline">Créer un deal →</button>
                </div>
              ) : deals.map(deal => (
                <div key={deal.id} className="rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-xs font-semibold text-slate-800 flex-1 leading-snug">{deal.title}</p>
                    <span className={cx("text-[10px] px-2 py-0.5 rounded-lg font-medium flex-shrink-0",
                      DEAL_COLORS[deal.status] ?? "bg-slate-100 text-slate-600")}>
                      {deal.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600">{fmt(deal.amount)}</span>
                    {deal.expected_close_date && (
                      <span className="text-slate-400">
                        📅 {new Date(deal.expected_close_date).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {deals.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-xs">
                  <span className="text-slate-400">Total pipeline</span>
                  <span className="font-bold text-emerald-600">{fmt(totalRevenue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Leads */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🎯</span>
              <span className="text-sm font-semibold text-slate-800">Leads</span>
            </div>
            <div className="text-center py-4">
              <button onClick={() => router.push("/leads")}
                className="text-xs text-emerald-600 hover:underline font-medium">
                Voir les leads associés →
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}