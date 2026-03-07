"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Company = { id: string; name: string };

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
};

type Deal = {
  id: string;
  title: string;
  amount: number;
  status: string;
};

type Task = {
  id: string;
  title: string;
  due_at: string | null;
  done: boolean;
};

type SortKey = "first_name" | "last_name" | "email" | "company_name" | "city" | "job_title";
type SortDir = "asc" | "desc";

function cx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

const AVATAR_COLORS = [
  "bg-emerald-500","bg-blue-500","bg-violet-500",
  "bg-amber-500","bg-rose-500","bg-indigo-500","bg-teal-500",
];
function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function initials(c: Contact) {
  return `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase();
}

const DEAL_STATUS_COLORS: Record<string, string> = {
  prospect:      "bg-slate-100 text-slate-600",
  qualification: "bg-amber-100 text-amber-700",
  proposition:   "bg-blue-100 text-blue-700",
  negociation:   "bg-purple-100 text-purple-700",
  gagne:         "bg-emerald-100 text-emerald-700",
  perdu:         "bg-rose-100 text-rose-700",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " €";
}

// ─── Panneau latéral contact ──────────────────────────────────
function ContactPanel({ contact, onClose, onEdit }: {
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingPanel, setLoadingPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<"infos" | "deals" | "tasks">("infos");

  useEffect(() => {
    async function load() {
      setLoadingPanel(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [dr, tr] = await Promise.all([
          fetch(`${API}/deals?contact_id=${contact.id}`, { headers }),
          fetch(`${API}/tasks?contact_id=${contact.id}`, { headers }),
        ]);
        if (dr.ok) { const d = await dr.json(); setDeals(Array.isArray(d) ? d : []); }
        if (tr.ok) { const t = await tr.json(); setTasks(Array.isArray(t) ? t : []); }
      } catch { /* silent */ }
      finally { setLoadingPanel(false); }
    }
    load();
  }, [contact.id]);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Panneau */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
        style={{ animation: "slideIn 0.2s ease-out" }}>

        {/* En-tête panneau */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={cx("w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0", avatarColor(contact.id))}>
              {initials(contact)}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {contact.first_name} {contact.last_name}
              </h2>
              {contact.job_title && <p className="text-xs text-slate-500">{contact.job_title}</p>}
              {contact.company_name && (
                <p className="text-xs text-emerald-600 font-medium">🏢 {contact.company_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
              ✏️ Modifier
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors font-bold">
              ✕
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-slate-200 px-2">
          {([
            { id: "infos",  label: "Infos",  icon: "👤" },
            { id: "deals",  label: `Deals`,  icon: "💼", count: deals.length },
            { id: "tasks",  label: "Tâches", icon: "✅", count: tasks.length },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cx(
                "flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all -mb-px",
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {"count" in tab && tab.count > 0 && (
                <span className={cx(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  activeTab === tab.id ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                )}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Onglet Infos ── */}
          {activeTab === "infos" && (
            <div className="space-y-5">

              {/* Coordonnées */}
              <section>
                <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3">Coordonnées</p>
                <div className="space-y-2.5">
                  {contact.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-sm flex-shrink-0">📧</div>
                      <a href={`mailto:${contact.email}`} className="text-sm text-blue-600 hover:underline truncate">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-sm flex-shrink-0">📞</div>
                      <a href={`tel:${contact.phone}`} className="text-sm text-slate-700 hover:text-emerald-600 transition-colors">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.city && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-sm flex-shrink-0">📍</div>
                      <span className="text-sm text-slate-600">{contact.city}</span>
                    </div>
                  )}
                  {contact.linkedin_url && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-sm flex-shrink-0">🔗</div>
                      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate">
                        Voir profil LinkedIn ↗
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* Infos pro */}
              {(contact.job_title || contact.company_name) && (
                <section>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3">Informations pro</p>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                    {contact.job_title && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Poste</span>
                        <span className="font-medium text-slate-800">{contact.job_title}</span>
                      </div>
                    )}
                    {contact.company_name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Entreprise</span>
                        <span className="font-medium text-slate-800">{contact.company_name}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Notes */}
              {contact.history && (
                <section>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3">Notes</p>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{contact.history}</p>
                  </div>
                </section>
              )}

              {/* Dates */}
              {contact.created_at && (
                <section>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">Informations</p>
                  <p className="text-xs text-slate-400">
                    Créé le {new Date(contact.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </section>
              )}
            </div>
          )}

          {/* ── Onglet Deals ── */}
          {activeTab === "deals" && (
            <div>
              {loadingPanel ? (
                <div className="space-y-2">
                  {[1,2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
                </div>
              ) : deals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-2">💼</div>
                  <p className="text-sm text-slate-500">Aucun deal associé</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deals.map(deal => (
                    <div key={deal.id} className="rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-800 truncate flex-1">{deal.title}</p>
                        <span className={cx("text-xs px-2 py-0.5 rounded-lg font-medium ml-2 flex-shrink-0",
                          DEAL_STATUS_COLORS[deal.status] ?? "bg-slate-100 text-slate-600")}>
                          {deal.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-emerald-600">{fmt(Number(deal.amount || 0))}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Onglet Tâches ── */}
          {activeTab === "tasks" && (
            <div>
              {loadingPanel ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm text-slate-500">Aucune tâche associée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className={cx(
                      "rounded-xl border p-3 flex items-center gap-3",
                      task.done ? "border-emerald-100 bg-emerald-50" : "border-slate-200"
                    )}>
                      <div className={cx(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                        task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                      )}>
                        {task.done && "✓"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cx("text-sm font-medium truncate", task.done && "line-through text-slate-400")}>
                          {task.title}
                        </p>
                        {task.due_at && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            📅 {new Date(task.due_at).toLocaleDateString("fr-FR")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────
export default function ContactsPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [contacts,  setContacts]  = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Filtres
  const [q,         setQ]         = useState("");
  const [companyId, setCompanyId] = useState("all");

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>("first_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Sélection multiple
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Panneau latéral
  const [panelContact, setPanelContact] = useState<Contact | null>(null);

  // Modal
  const [open,      setOpen]      = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [jobTitle,  setJobTitle]  = useState("");
  const [city,      setCity]      = useState("");
  const [linkedin,  setLinkedin]  = useState("");
  const [company,   setCompany]   = useState("");
  const [history,   setHistory]   = useState("");
  const [formError, setFormError] = useState("");

  // Confirm delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function loadCompanies() {
    const t = getToken(); if (!t) return;
    try {
      const res  = await fetch(`${API}/companies`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erreur companies");
      setCompanies(Array.isArray(data) ? data.map((x: any) => ({ id: String(x.id), name: String(x.name) })) : []);
    } catch (e: any) { setError(e?.message); }
  }

  async function loadContacts() {
    setError(null); setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (companyId !== "all") params.set("companyId", companyId);
      const res  = await fetch(`${API}/contacts?${params.toString()}`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erreur contacts");
      setContacts(Array.isArray(data) ? data : []);
      setSelected(new Set());
    } catch (e: any) { setError(e?.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadCompanies();
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ── Tri ──
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const va = (a[sortKey] ?? "").toString().toLowerCase();
      const vb = (b[sortKey] ?? "").toString().toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [contacts, sortKey, sortDir]);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-emerald-500 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  // ── Sélection ──
  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(c => c.id)));
  }

  async function deleteSelected() {
    if (!confirm(`Supprimer ${selected.size} contact(s) ?`)) return;
    const t = getToken(); if (!t) return;
    await Promise.all([...selected].map(id =>
      fetch(`${API}/contacts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } })
    ));
    setContacts(prev => prev.filter(c => !selected.has(c.id)));
    setSelected(new Set());
  }

 
  // ── Modal ──
  function openCreate() {
    setFormError(""); setEditingId(null);
    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setJobTitle(""); setCity(""); setLinkedin(""); setCompany(""); setHistory("");
    setOpen(true);
  }

  function openEdit(c: Contact, e?: React.MouseEvent) {
    e?.stopPropagation();
    setFormError(""); setEditingId(c.id);
    setFirstName(c.first_name ?? ""); setLastName(c.last_name ?? "");
    setEmail(c.email ?? ""); setPhone(c.phone ?? "");
    setJobTitle(c.job_title ?? ""); setCity(c.city ?? "");
    setLinkedin(c.linkedin_url ?? ""); setCompany(c.company_id ?? "");
    setHistory(c.history ?? "");
    setOpen(true);
    setPanelContact(null);
  }

  function closeModal() { setOpen(false); setEditingId(null); setFormError(""); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    const t = getToken(); if (!t) return;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError("Prénom, nom et email sont obligatoires."); return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingId;
      const res = await fetch(`${API}/contacts${isEdit ? `/${editingId}` : ""}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          first_name: firstName.trim(), last_name: lastName.trim(),
          email: email.trim(), phone: phone.trim() || null,
          job_title: jobTitle.trim() || null, city: city.trim() || null,
          linkedin_url: linkedin.trim() || null,
          history: history.trim() || null, company_id: company || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      closeModal(); await loadContacts();
    } catch (e: any) { setFormError(e?.message || "Erreur"); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/contacts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error("Erreur suppression");
      setContacts(prev => prev.filter(c => c.id !== id));
      setDeletingId(null);
      if (panelContact?.id === id) setPanelContact(null);
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
                { label: "Dashboard",   path: "/dashboard",   icon: "📊" },
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
                <button onClick={() => router.push("/contacts")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left bg-emerald-50 text-emerald-700 font-medium">
                  <span>👤</span><span>Contacts</span>
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
                  <h1 className="text-xl font-semibold text-slate-900">👤 Contacts</h1>
                  <p className="text-sm text-slate-500">Gérez vos contacts et leur entreprise associée</p>
                </div>

                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{contacts.length}</div>
                    <div className="text-xs text-slate-400">Total contacts</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{companies.length}</div>
                    <div className="text-xs text-slate-400">Entreprises</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={openCreate}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    + Nouveau contact
                  </button>
                  <button onClick={loadContacts}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    title="Rafraîchir">⟳</button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-400">
                  <span className="text-slate-400 text-sm">🔎</span>
                  <input className="w-full bg-transparent text-sm outline-none"
                    placeholder="Rechercher (nom, email, ville...)..."
                    value={q} onChange={e => setQ(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loadContacts()} />
                </div>

                <select value={companyId} onChange={e => setCompanyId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                  <option value="all">Toutes les entreprises</option>
                  {companies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
                </select>

                <button onClick={loadContacts}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 text-slate-600">
                  Filtrer
                </button>

                {/* Barre sélection multiple */}
                {selected.size > 0 && (
                  <div className="flex items-center gap-2 ml-auto rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
                    <span className="text-xs font-medium text-rose-700">{selected.size} sélectionné(s)</span>
                    <button onClick={deleteSelected}
                      className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-medium text-white hover:bg-rose-600 transition-colors">
                      🗑 Supprimer
                    </button>
                    <button onClick={() => setSelected(new Set())}
                      className="text-xs text-rose-400 hover:text-rose-600">✕</button>
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

            {loading ? <SkeletonContacts /> : contacts.length === 0 ? (
              <EmptyState onCreate={openCreate} />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                {/* Header tableau avec colonnes triables */}
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {/* Checkbox tout sélectionner */}
                  <div className="col-span-1 flex items-center">
                    <input type="checkbox"
                      checked={selected.size === sorted.length && sorted.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer" />
                  </div>
                  <div className="col-span-3 cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort("first_name")}>
                    Contact <SortIcon k="first_name" />
                  </div>
                  <div className="col-span-2 cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort("job_title")}>
                    Poste <SortIcon k="job_title" />
                  </div>
                  <div className="col-span-2 cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort("company_name")}>
                    Entreprise <SortIcon k="company_name" />
                  </div>
                  <div className="col-span-2 cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort("city")}>
                    Ville <SortIcon k="city" />
                  </div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {sorted.map(c => (
                  <div key={c.id}
                    onClick={() => router.push(`/contacts/${c.id}`)}
                    className={cx(
                      "grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50 transition-colors cursor-pointer",
                      selected.has(c.id) && "bg-emerald-50/50",
                      panelContact?.id === c.id && "bg-emerald-50 border-l-2 border-l-emerald-500"
                    )}>

                    {/* Checkbox */}
                    <div className="col-span-1" onClick={e => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer" />
                    </div>

                    {/* Contact */}
                    <div className="col-span-3 flex items-center gap-2.5">
                      <div className={cx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0", avatarColor(c.id))}>
                        {initials(c)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{c.first_name} {c.last_name}</div>
                        <div className="text-xs text-slate-400 truncate">{c.email}</div>
                      </div>
                    </div>

                    {/* Poste */}
                    <div className="col-span-2 text-xs text-slate-500 truncate">
                      {c.job_title || "—"}
                    </div>

                    {/* Entreprise */}
                    <div className="col-span-2 text-xs text-slate-500 truncate">
                      {c.company_name ? `🏢 ${c.company_name}` : "—"}
                    </div>

                    {/* Ville */}
                    <div className="col-span-2 text-xs text-slate-500 truncate">
                      {c.city ? `📍 ${c.city}` : "—"}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={e => openEdit(c, e)}
                        className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Modifier">✏️</button>
                      {deletingId === c.id ? (
                        <div className="flex gap-1">
                          <button onClick={e => { e.stopPropagation(); setDeletingId(null); }}
                            className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Annuler</button>
                          <button onClick={e => onDelete(c.id, e)}
                            className="rounded-lg px-2 py-1 text-xs text-white bg-rose-500 hover:bg-rose-600">Confirmer</button>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setDeletingId(c.id); }}
                          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Supprimer">🗑</button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">{contacts.length} contact{contacts.length > 1 ? "s" : ""}</span>
                  {selected.size > 0 && (
                    <span className="text-emerald-600 font-medium">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ══ Panneau latéral ══ */}
      {panelContact && (
        <ContactPanel
          contact={panelContact}
          onClose={() => setPanelContact(null)}
          onEdit={() => openEdit(panelContact)}
        />
      )}

      {/* ══ Modal création / édition ══ */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? "Modifier le contact" : "Nouveau contact"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Champs avec * obligatoires</p>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-lg font-bold">✕</button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Prénom <span className="text-rose-500">*</span></label>
                  <input autoFocus className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Nom <span className="text-rose-500">*</span></label>
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Email <span className="text-rose-500">*</span></label>
                <input type="email" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Téléphone</label>
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={phone} onChange={e => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Poste / Titre</label>
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Ex: Responsable RH" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Ville</label>
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Paris" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Entreprise</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    value={company} onChange={e => setCompany(e.target.value)}>
                    <option value="">Aucune</option>
                    {companies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">LinkedIn URL</label>
                <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
                  rows={3} value={history} onChange={e => setHistory(e.target.value)}
                  placeholder="Ex: Intéressé par formation SEO..." />
              </div>

              {formError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-600">⚠️ {formError}</div>
              )}

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
                  ) : editingId ? "Enregistrer" : "Créer le contact"}
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
      <div className="text-4xl mb-3">👤</div>
      <div className="text-lg font-semibold text-slate-800">Aucun contact</div>
      <div className="mt-1 text-sm text-slate-500">Crée ton premier contact et associe-le à une entreprise.</div>
      <button onClick={onCreate}
        className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        + Nouveau contact
      </button>
    </div>
  );
}

function SkeletonContacts() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 h-10 animate-pulse" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="h-4 w-4 animate-pulse rounded bg-slate-200 flex-shrink-0" />
          <div className="h-8 w-8 rounded-full animate-pulse bg-slate-200 flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-52 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}