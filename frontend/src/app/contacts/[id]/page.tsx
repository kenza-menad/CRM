"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  city: string | null;
  linkedin_url: string | null;
  history: string | null;
  company_id: string | null;
  company_name?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Deal = {
  id: string;
  title: string;
  amount: number | null;
  status: string;
  expected_close_date: string | null;
};

type Task = {
  id: string;
  title: string;
  due_at: string | null;
  done: boolean;
};

type Activity = {
  id: string;
  type: "note" | "email" | "appel" | "reunion" | "tache";
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
function initials(c: Contact) {
  return `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase();
}
function fmt(n: number | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " €";
}
function fmtDate(d: string | null) {
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
  tache:   { icon: "✅", color: "text-violet-600",  bg: "bg-violet-100",  label: "Tâche" },
};

/* ══ Page ══════════════════════════════════════════════════════ */
export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [contact, setContact] = useState<Contact | null>(null);
  const [deals,   setDeals]   = useState<Deal[]>([]);
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Onglet centre
  const [activeTab, setActiveTab] = useState<"apropos" | "activites">("apropos");

  // Note rapide
  const [noteText,    setNoteText]    = useState("");
  const [savingNote,  setSavingNote]  = useState(false);
  const [activities,  setActivities]  = useState<Activity[]>([]);

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
      const [cr, dr, tr] = await Promise.all([
        fetch(`${API}/contacts/${id}`, { headers }),
        fetch(`${API}/deals?contact_id=${id}`, { headers }),
        fetch(`${API}/tasks?contact_id=${id}`, { headers }),
      ]);
      if (cr.ok) setContact(await cr.json());
      else throw new Error("Contact introuvable");
      if (dr.ok) { const d = await dr.json(); setDeals(Array.isArray(d) ? d : []); }
      if (tr.ok) { const t2 = await tr.json(); setTasks(Array.isArray(t2) ? t2 : []); }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Sauvegarde note
  async function submitNote() {
    if (!noteText.trim() || !contact) return;
    setSavingNote(true);
    const t = getToken(); if (!t) return;
    try {
      await fetch(`${API}/contacts/${contact.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ content: noteText.trim() }),
      });
      setActivities(prev => [{
        id: Date.now().toString(), type: "note",
        content: noteText.trim(), created_at: new Date().toISOString(),
      }, ...prev]);
      setNoteText("");
      setActiveTab("activites");
    } catch { /* silent */ }
    finally { setSavingNote(false); }
  }

  // Édition inline d'un champ
  function startEdit(field: string, value: string | null) {
    setEditField(field);
    setEditValue(value ?? "");
  }

  async function saveEdit() {
  if (!contact || !editField) return;
  setSavingEdit(true);
  const t = getToken(); if (!t) return;
  try {
    const updated = { ...contact, [editField]: editValue || null };
    const res = await fetch(`${API}/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        first_name:   updated.first_name,
        last_name:    updated.last_name,
        email:        updated.email,
        phone:        updated.phone,
        job_title:    updated.job_title,
        city:         updated.city,
        linkedin_url: updated.linkedin_url,
        history:      updated.history,
        company_id:   updated.company_id,
      }),
    });
      if (res.ok) {
        setContact(prev => prev ? { ...prev, [editField]: editValue || null } : prev);
      }
    } catch { /* silent */ }
    finally { setSavingEdit(false); setEditField(null); }
  }

  // Champ éditable inline
  function EditableField({ field, label, value, type = "text" }: {
    field: string; label: string; value: string | null; type?: string;
  }) {
    const isEditing = editField === field;
    return (
      <div className="group">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input autoFocus type={type}
              className="flex-1 rounded-lg border border-emerald-400 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-100"
              value={editValue} onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditField(null); }} />
            <button onClick={saveEdit} disabled={savingEdit}
              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50">
              {savingEdit ? "..." : "✓"}
            </button>
            <button onClick={() => setEditField(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-h-[28px]">
            <span className={cx("text-sm", value ? "text-slate-800" : "text-slate-300")}>
              {value || "—"}
            </span>
            <button onClick={() => startEdit(field, value)}
              className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-emerald-600 transition-all">
              ✏️
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl animate-spin inline-block">⟳</div>
        <p className="mt-3 text-sm text-slate-500">Chargement du contact...</p>
      </div>
    </div>
  );

  if (error || !contact) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-slate-600">{error ?? "Contact introuvable"}</p>
        <button onClick={() => router.push("/contacts")}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
          ← Retour aux contacts
        </button>
      </div>
    </div>
  );

  /* ══ Render ══ */
  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Topbar fil d'ariane ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 text-sm">
        <button onClick={() => router.push("/contacts")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors font-medium">
          ← Contacts
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-semibold">{contact.first_name} {contact.last_name}</span>

        {/* Actions rapides topbar */}
        <div className="ml-auto flex items-center gap-2">
          {[
            { icon: "📝", label: "Note",    action: () => { setNoteText(""); setActiveTab("activites"); } },
            { icon: "📧", label: "Email",   action: () => { if (contact.email) window.open(`https://mail.google.com/mail/?view=cm&to=${contact.email}`, "_blank"); } },
           
            { icon: "✅", label: "Tâche",   action: () => router.push("/tasks") },
          
          ].map(btn => (
            <button key={btn.label} onClick={btn.action}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-emerald-300 transition-colors">
              <span>{btn.icon}</span><span>{btn.label}</span>
            </button>
          ))}
          <button onClick={() => router.push("/contacts")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
            ✕ Fermer
          </button>
        </div>
      </div>

      {/* ── Contenu 3 colonnes ── */}
      <div className="flex gap-0 h-[calc(100vh-49px)]">

        {/* ══ COLONNE 1 — Infos contact (sidebar gauche) ══ */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">

          {/* Avatar + nom */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex flex-col items-center text-center">
              <div className={cx("w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3", avatarColor(contact.id))}>
                {initials(contact)}
              </div>
              <h1 className="text-lg font-bold text-slate-900">{contact.first_name} {contact.last_name}</h1>
              {contact.job_title && <p className="text-sm text-slate-500 mt-0.5">{contact.job_title}</p>}
              {contact.company_name && (
                <button onClick={() => router.push("/entreprises")}
                  className="mt-1 text-sm text-emerald-600 hover:underline font-medium">
                  🏢 {contact.company_name}
                </button>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`}
                  className="mt-2 text-xs text-blue-500 hover:underline flex items-center gap-1">
                  {contact.email} ↗
                </a>
              )}
            </div>
          </div>

          {/* Infos rapides */}
          <div className="p-5 border-b border-slate-100 space-y-3">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Coordonnées</p>

            {contact.phone && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="text-base">📞</span>
                <a href={`tel:${contact.phone}`} className="hover:text-emerald-600 transition-colors">{contact.phone}</a>
              </div>
            )}
            {contact.city && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="text-base">📍</span> {contact.city}
              </div>
            )}
            {contact.linkedin_url && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-base">🔗</span>
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="text-blue-500 hover:underline">Profil LinkedIn ↗</a>
              </div>
            )}
          </div>

          {/* Stats rapides */}
          <div className="p-5 border-b border-slate-100">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3">Résumé</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Deals",  value: deals.length,               color: "text-blue-600" },
                { label: "Tâches", value: tasks.length,               color: "text-violet-600" },
                { label: "Ouverts", value: deals.filter(d => d.status !== "gagne" && d.status !== "perdu").length, color: "text-amber-600" },
                { label: "Terminés", value: tasks.filter(t => t.done).length, color: "text-emerald-600" },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-slate-50 p-2.5 text-center">
                  <p className={cx("text-lg font-bold", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Métadonnées */}
          <div className="p-5 space-y-1.5">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">Informations</p>
            <div className="text-xs text-slate-500 space-y-1">
              <p>Créé le <span className="text-slate-700 font-medium">{fmtDate(contact.created_at ?? null)}</span></p>
              {contact.updated_at && (
                <p>Modifié le <span className="text-slate-700 font-medium">{fmtDate(contact.updated_at)}</span></p>
              )}
            </div>
          </div>
        </aside>

        {/* ══ COLONNE 2 — Onglets À propos / Activités ══ */}
        <div className="flex-1 overflow-y-auto">

          {/* Onglets */}
          <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-1 sticky top-0 z-10">
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

            {/* ── Onglet À propos ── */}
            {activeTab === "apropos" && (
              <>
                {/* Détails */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800">Détails du contact</h3>
                    <span className="text-xs text-slate-400">Cliquer sur un champ pour modifier</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <EditableField field="first_name"   label="Prénom"         value={contact.first_name} />
                    <EditableField field="last_name"    label="Nom"            value={contact.last_name} />
                    <EditableField field="email"        label="E-mail"         value={contact.email} type="email" />
                    <EditableField field="phone"        label="Téléphone"      value={contact.phone} />
                    <EditableField field="job_title"    label="Poste"          value={contact.job_title} />
                    <EditableField field="city"         label="Ville"          value={contact.city} />
                    <EditableField field="linkedin_url" label="LinkedIn"       value={contact.linkedin_url} />
                    <EditableField field="company_name" label="Entreprise"     value={contact.company_name ?? null} />
                  </div>
                </div>

                {/* Notes internes */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Notes internes</h3>
                  {contact.history ? (
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-3">
                      {contact.history}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Aucune note pour ce contact.</p>
                  )}
                </div>

                {/* Abonnements */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">📬 Abonnements aux communications</h3>
                  <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                    <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600">
                      Gérez les types de communications que ce contact accepte de recevoir. 
                      Activez ou désactivez les emails marketing, newsletters et rappels.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {["Newsletter", "Promotions", "Rappels"].map(label => (
                      <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <div className="w-3 h-3 rounded-full bg-slate-200" />
                        <span className="text-xs text-slate-600">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Onglet Activités ── */}
            {activeTab === "activites" && (
              <>
                {/* Zone de saisie note rapide */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Ajouter une note</p>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
                    rows={3}
                    placeholder="Écrivez une note sur ce contact..."
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)} />
                  <div className="flex justify-end mt-2">
                    <button onClick={submitNote} disabled={!noteText.trim() || savingNote}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                      {savingNote ? "Enregistrement..." : "💾 Enregistrer la note"}
                    </button>
                  </div>
                </div>

                {/* Liste activités */}
                {activities.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-sm text-slate-500">Aucune activité enregistrée</p>
                    <p className="text-xs text-slate-400 mt-1">Ajoutez une note pour démarrer l'historique.</p>
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
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cx("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
                              <span className="text-xs text-slate-400">
                                {new Date(act.created_at).toLocaleDateString("fr-FR", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{act.content}</p>
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

        {/* ══ COLONNE 3 — Deals + Tâches ══ */}
        <aside className="w-80 flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto">

          {/* ── Section Deals ── */}
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
                    className="mt-2 text-xs text-emerald-600 hover:underline">Créer un deal →</button>
                </div>
              ) : deals.map(deal => (
                <div key={deal.id} className="rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-slate-800 leading-snug flex-1">{deal.title}</p>
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
                <button onClick={() => router.push("/pipeline")}
                  className="w-full text-xs text-slate-400 hover:text-emerald-600 py-1 transition-colors">
                  Afficher tous les deals ↗
                </button>
              )}
            </div>
          </div>

          {/* ── Section Tâches ── */}
          <div className="border-b border-slate-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">✅</span>
                <span className="text-sm font-semibold text-slate-800">Tâches</span>
                <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-bold">
                  {tasks.filter(t => !t.done).length}
                </span>
              </div>
              <button onClick={() => router.push("/tasks")}
                className="text-xs text-emerald-600 hover:underline font-medium">+ Ajouter</button>
            </div>

            <div className="px-4 pb-4 space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">Aucune tâche</p>
                  <button onClick={() => router.push("/tasks")}
                    className="mt-2 text-xs text-emerald-600 hover:underline">Créer une tâche →</button>
                </div>
              ) : tasks.slice(0, 5).map(task => (
                <div key={task.id} className={cx(
                  "rounded-xl border p-3 flex items-start gap-2.5",
                  task.done ? "border-emerald-100 bg-emerald-50/50" : "border-slate-200"
                )}>
                  <div className={cx(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 text-[8px] font-bold",
                    task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                  )}>
                    {task.done && "✓"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cx("text-xs font-medium truncate", task.done && "line-through text-slate-400")}>
                      {task.title}
                    </p>
                    {task.due_at && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        📅 {new Date(task.due_at).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {tasks.length > 5 && (
                <button onClick={() => router.push("/tasks")}
                  className="w-full text-xs text-slate-400 hover:text-emerald-600 py-1 transition-colors">
                  Voir toutes les tâches ({tasks.length}) ↗
                </button>
              )}
            </div>
          </div>

          {/* ── Section Leads ── */}
          <div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">🎯</span>
                <span className="text-sm font-semibold text-slate-800">Leads associés</span>
              </div>
              <button onClick={() => router.push("/leads")}
                className="text-xs text-emerald-600 hover:underline font-medium">Voir tous</button>
            </div>
            <div className="px-4 pb-4">
              <div className="text-center py-6">
                <p className="text-xs text-slate-400">Retrouvez les leads dans</p>
                <button onClick={() => router.push("/leads")}
                  className="mt-1 text-xs text-emerald-600 hover:underline font-medium">
                  la page Leads →
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}