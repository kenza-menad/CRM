"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import React from "react";

const API = process.env.NEXT_PUBLIC_API_URL!;

type LeadStatus = "nouveau" | "en_cours" | "converti" | "perdu";

interface Lead {
  id: string; title: string; status: LeadStatus; source: string | null;
  value_eur: number | null; contact_id: string | null; assigned_to: string | null;
  first_name: string | null; last_name: string | null; contact_email: string | null;
  company_name: string | null; assigned_email: string | null; created_at: string;
}
interface Contact { id: string; first_name: string; last_name: string; email: string; }
interface User { id: string; email: string; }
interface FormState {
  title: string; status: LeadStatus; source: string;
  value_eur: string; contact_id: string; assigned_to: string;
}

const STAGES: { status: LeadStatus; label: string; color: string }[] = [
  { status: "nouveau",  label: "Nouveau",  color: "#3b82f6" },
  { status: "en_cours", label: "En cours", color: "#f59e0b" },
  { status: "converti", label: "Converti", color: "#10b981" },
  { status: "perdu",    label: "Perdu",    color: "#ef4444" },
];

const ALL_STATUSES: LeadStatus[] = ["nouveau", "en_cours", "converti", "perdu"];

const STATUS_COLORS: Record<LeadStatus, string> = {
  nouveau:  "bg-blue-100 text-blue-700",
  en_cours: "bg-amber-100 text-amber-700",
  converti: "bg-emerald-100 text-emerald-700",
  perdu:    "bg-rose-100 text-rose-700",
};

function cx(...xs: Array<string|false|undefined|null>) { return xs.filter(Boolean).join(" "); }
function fmt(n: number) { return new Intl.NumberFormat("fr-FR",{minimumFractionDigits:0}).format(Math.round(n)); }
function formatEur(v: number|null|undefined): string { if (v==null) return "—"; return fmt(Number(v))+" €"; }

// ─── SVG Icons ───────────────────────────────────────────────
const IcoTarget = ({ size=18 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const IcoSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcoRefresh = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const IcoTrash = ({ size=12 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IcoX = ({ size=16 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoWarning = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IcoBuilding = ({ size=10 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IcoMapPin = ({ size=10 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IcoDotsVertical = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
);
const IcoKanban = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="4" height="18" rx="1"/><rect x="10" y="3" width="4" height="12" rx="1"/><rect x="17" y="3" width="4" height="15" rx="1"/>
  </svg>
);
const IcoList = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

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

  const handle = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.title.trim()) { setError("Le titre est obligatoire"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title, status: form.status, source: form.source||null,
          value_eur: form.value_eur ? parseFloat(form.value_eur) : null,
          contact_id: form.contact_id||null, assigned_to: form.assigned_to||null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"Erreur");
      onSave(data as Lead); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Erreur inconnue"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Nouveau lead</h2>
            <p className="text-xs text-slate-400 mt-0.5">Renseigne les informations du lead</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <IcoX />
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-600 flex items-center gap-2">
              <IcoWarning /> {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Intitulé <span className="text-rose-500">*</span></label>
            <input autoFocus className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              value={form.title} onChange={handle("title")} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Ex: Formation SEO Avancé"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Statut</label>
              <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                value={form.status} onChange={handle("status")}>
                {STAGES.map(s=><option key={s.status} value={s.status}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Source</label>
              <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                value={form.source} onChange={handle("source")}>
                <option value="">— Source —</option>
                {["Site web","LinkedIn","Référence","Facebook","Google Ads","Salon","Email","Téléphone"].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Valeur estimée (€)</label>
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                type="number" value={form.value_eur} onChange={handle("value_eur")} placeholder="Ex: 4500"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Contact associé</label>
              <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                value={form.contact_id} onChange={handle("contact_id")}>
                <option value="">— Aucun contact —</option>
                {contacts.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Commercial assigné</label>
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
              value={form.assigned_to} onChange={handle("assigned_to")}>
              <option value="">— Non assigné —</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Annuler</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Création...
              </span>
            ) : "Créer le lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ lead, stageColor, onStatusChange, onDelete, onClick }: {
  lead: Lead; stageColor: string;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-3 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all select-none group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-slate-800 leading-tight flex-1 line-clamp-2">{lead.title}</p>
        <div className="relative flex-shrink-0" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setMenuOpen(!menuOpen)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <IcoDotsVertical />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              {ALL_STATUSES.filter(s=>s!==lead.status).map(s=>{
                const stage=STAGES.find(st=>st.status===s)!;
                return (
                  <button key={s}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                    onClick={()=>{onStatusChange(lead.id,s);setMenuOpen(false);}}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:stage.color}}/>
                    {stage.label}
                  </button>
                );
              })}
              <hr className="my-1 border-slate-100"/>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                onClick={()=>{onDelete(lead.id);setMenuOpen(false);}}>
                <IcoTrash /> Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      {lead.company_name && (
        <p className="text-[10px] text-slate-400 mb-2 truncate flex items-center gap-1">
          <IcoBuilding /> {lead.company_name}
        </p>
      )}

      <div className="space-y-0.5 mb-2">
        {(lead.first_name||lead.last_name) && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
              style={{backgroundColor:stageColor}}>
              {(lead.first_name||"?")[0].toUpperCase()}
            </div>
            <span className="text-[10px] text-slate-500 truncate">{lead.first_name} {lead.last_name}</span>
          </div>
        )}
        {lead.source && (
          <p className="text-[10px] text-slate-400 flex items-center gap-1"><IcoMapPin/> {lead.source}</p>
        )}
      </div>

      {lead.value_eur!=null && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">{formatEur(lead.value_eur)}</span>
        </div>
      )}

      {lead.assigned_email && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 bg-indigo-500">
            {lead.assigned_email[0].toUpperCase()}
          </div>
          <span className="text-[10px] text-slate-400 truncate">{lead.assigned_email}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const router = useRouter();

  const token = useMemo(() => { if (typeof window==="undefined") return null; return localStorage.getItem("token"); }, []);

  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [users,        setUsers]        = useState<User[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [view,         setView]         = useState<"kanban"|"list">("kanban");
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<"all"|LeadStatus>("all");
  const [filterUser,   setFilterUser]   = useState("all");
  const [showModal,    setShowModal]    = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus|null>(null);
  const [draggedId,    setDraggedId]    = useState<string|null>(null);

  function requireToken(): string|null {
    const t = typeof window!=="undefined" ? localStorage.getItem("token") : null;
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  const fetchLeads = useCallback(async () => {
    const t = typeof window!=="undefined" ? localStorage.getItem("token") : null; if (!t) return;
    try {
      const r = await fetch(`${API}/leads`,{headers:{Authorization:`Bearer ${t}`}});
      const data = await r.json();
      setLeads(Array.isArray(data)?(data as Lead[]):[]);
    } catch(err:unknown){setError("Impossible de charger les leads : "+(err instanceof Error?err.message:""));}
  },[]);

  const fetchContacts = useCallback(async () => {
    const t = typeof window!=="undefined"?localStorage.getItem("token"):null; if (!t) return;
    try{const r=await fetch(`${API}/contacts`,{headers:{Authorization:`Bearer ${t}`}});if(r.ok){const d=await r.json();setContacts(Array.isArray(d)?d:[]);}}catch{}
  },[]);

  const fetchUsers = useCallback(async () => {
    const t = typeof window!=="undefined"?localStorage.getItem("token"):null; if (!t) return;
    try{const r=await fetch(`${API}/users`,{headers:{Authorization:`Bearer ${t}`}});if(r.ok){const d=await r.json();setUsers(Array.isArray(d)?d:[]);}}catch{}
  },[]);

  useEffect(()=>{
    if(!token){router.push("/login");return;}
    Promise.all([fetchLeads(),fetchContacts(),fetchUsers()]).finally(()=>setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[router]);

  async function handleStatusChange(id:string,status:LeadStatus){
    const t=requireToken();if(!t)return;
    try{
      const r=await fetch(`${API}/leads/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({status})});
      if(!r.ok){const d=await r.json();throw new Error(d.error);}
      setLeads(prev=>prev.map(l=>l.id===id?{...l,status}:l));
    }catch(err:unknown){alert("Erreur : "+(err instanceof Error?err.message:""));}
  }

  async function handleDelete(id:string){
    if(!confirm("Supprimer ce lead ?"))return;
    const t=requireToken();if(!t)return;
    try{
      await fetch(`${API}/leads/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${t}`}});
      setLeads(prev=>prev.filter(l=>l.id!==id));
    }catch(err:unknown){alert("Erreur : "+(err instanceof Error?err.message:""));}
  }

  function handleDragStart(e:React.DragEvent,leadId:string){setDraggedId(leadId);e.dataTransfer.effectAllowed="move";}
  function handleDragOver(e:React.DragEvent,status:LeadStatus){e.preventDefault();e.dataTransfer.dropEffect="move";setDragOverStatus(status);}
  function handleDragLeave(){setDragOverStatus(null);}
  async function handleDrop(e:React.DragEvent,status:LeadStatus){
    e.preventDefault();setDragOverStatus(null);
    const id=draggedId;if(!id)return;
    const lead=leads.find(l=>l.id===id);
    if(!lead||lead.status===status)return;
    setLeads(prev=>prev.map(l=>l.id===id?{...l,status}:l));
    const t=requireToken();if(!t)return;
    try{
      const r=await fetch(`${API}/leads/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({status})});
      if(!r.ok)setLeads(prev=>prev.map(l=>l.id===id?{...l,status:lead.status}:l));
    }catch{setLeads(prev=>prev.map(l=>l.id===id?{...l,status:lead.status}:l));}
    setDraggedId(null);
  }

  const filtered = useMemo(()=>leads.filter(l=>{
    const q=search.toLowerCase();
    const matchQ=!q||l.title?.toLowerCase().includes(q)||l.company_name?.toLowerCase().includes(q)||l.first_name?.toLowerCase().includes(q)||l.last_name?.toLowerCase().includes(q);
    return matchQ&&(filterStatus==="all"||l.status===filterStatus)&&(filterUser==="all"||l.assigned_email===filterUser);
  }),[leads,search,filterStatus,filterUser]);

  const grouped = useMemo(()=>{
    const g:Record<LeadStatus,Lead[]>={nouveau:[],en_cours:[],converti:[],perdu:[]};
    filtered.forEach(l=>{if(g[l.status])g[l.status].push(l);else g["nouveau"].push(l);});
    return g;
  },[filtered]);

  const totalValue   = useMemo(()=>leads.reduce((s,l)=>s+Number(l.value_eur||0),0),[leads]);
  const totalConverti= useMemo(()=>leads.filter(l=>l.status==="converti").reduce((s,l)=>s+Number(l.value_eur||0),0),[leads]);
  const uniqueUsers  = [...new Set(leads.filter(l=>l.assigned_email).map(l=>l.assigned_email as string))];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <main className="flex-1 min-w-0 flex flex-col">

          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <span className="text-slate-500"><IcoTarget /></span>Leads
                  </h1>
                  <p className="text-sm text-slate-500">Gérez vos opportunités commerciales</p>
                </div>

                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{fmt(totalValue)} €</div>
                    <div className="text-xs text-slate-400">Valeur totale</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200"/>
                  <div className="text-center">
                    <div className="font-bold text-emerald-600">{fmt(totalConverti)} €</div>
                    <div className="text-xs text-slate-400">Convertis</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200"/>
                  <div className="text-center">
                    <div className="font-bold text-slate-900">{leads.length}</div>
                    <div className="text-xs text-slate-400">Total leads</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={()=>setShowModal(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    + Nouveau lead
                  </button>
                  <button onClick={()=>{setLoading(true);fetchLeads().finally(()=>setLoading(false));}}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                    title="Rafraîchir">
                    <IcoRefresh />
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-slate-300 flex-1 min-w-48">
                  <span className="text-slate-400"><IcoSearch /></span>
                  <input className="w-full bg-transparent text-sm outline-none" placeholder="Rechercher un lead..."
                    value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>

                {view==="list" && (
                  <>
                    <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value as "all"|LeadStatus)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                      <option value="all">Tous les statuts</option>
                      {STAGES.map(s=><option key={s.status} value={s.status}>{s.label}</option>)}
                    </select>
                    <select value={filterUser} onChange={e=>setFilterUser(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                      <option value="all">Tous les commerciaux</option>
                      {uniqueUsers.map(email=><option key={email} value={email}>{email}</option>)}
                    </select>
                  </>
                )}

                <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden ml-auto">
                  <button onClick={()=>setView("kanban")}
                    className={cx("flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors",
                      view==="kanban"?"bg-emerald-600 text-white":"text-slate-600 hover:bg-slate-50")}>
                    <IcoKanban /> Kanban
                  </button>
                  <button onClick={()=>setView("list")}
                    className={cx("flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-l border-slate-200 transition-colors",
                      view==="list"?"bg-emerald-600 text-white":"text-slate-600 hover:bg-slate-50")}>
                    <IcoList /> Liste
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-x-auto">
            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-2">
                <IcoWarning /> {error}
                <button className="ml-3 underline" onClick={fetchLeads}>Réessayer</button>
              </div>
            )}

            {loading ? (
              view==="kanban" ? <SkeletonKanban/> : <SkeletonList/>
            ) : view==="kanban" ? (

              /* ══ VUE KANBAN ══ */
              <div className="flex" style={{minWidth:`${STAGES.length*272}px`}}>
                {STAGES.map((stage,index)=>{
                  const stageLeads=grouped[stage.status];
                  const stageTotal=stageLeads.reduce((s,l)=>s+Number(l.value_eur||0),0);
                  const isDragOver=dragOverStatus===stage.status;
                  return (
                    <div key={stage.status} className="flex-shrink-0 w-64 flex flex-col px-3"
                      style={{borderLeft:index>0?"1px solid #e2e8f0":"none"}}>
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:stage.color}}/>
                          <span className="text-sm font-semibold text-slate-800 flex-1 truncate">{stage.label}</span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{stageLeads.length}</span>
                        </div>
                        <p className="text-xs text-slate-400 pl-5">{stageTotal>0?fmt(stageTotal)+" €":"—"}</p>
                      </div>
                      <div className="flex-1 space-y-2 min-h-48 rounded-2xl p-2 transition-all duration-150"
                        style={{border:isDragOver?`2px solid ${stage.color}`:"1px solid #e2e8f0",backgroundColor:isDragOver?`${stage.color}12`:"#f8fafc"}}
                        onDragOver={e=>handleDragOver(e,stage.status)}
                        onDragLeave={handleDragLeave}
                        onDrop={e=>handleDrop(e,stage.status)}>
                        {stageLeads.length===0 ? (
                          <div className="h-16 flex items-center justify-center text-xs text-slate-400">Déposez ici</div>
                        ) : stageLeads.map(lead=>(
                          <div key={lead.id} draggable onDragStart={e=>handleDragStart(e,lead.id)}>
                            <KanbanCard lead={lead} stageColor={stage.color}
                              onStatusChange={handleStatusChange} onDelete={handleDelete} onClick={()=>{}}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            ) : (

              /* ══ VUE LISTE ══ */
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-3">Formation</div>
                  <div className="col-span-2">Entreprise</div>
                  <div className="col-span-2">Contact</div>
                  <div className="col-span-1">Statut</div>
                  <div className="col-span-1">Source</div>
                  <div className="col-span-1">Valeur</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {filtered.length===0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">Aucun lead trouvé</div>
                ) : filtered.map(l=>(
                  <div key={l.id} className="grid grid-cols-12 gap-2 items-center px-5 py-3.5 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                    <div className="col-span-3 font-medium text-slate-900 truncate">{l.title}</div>
                    <div className="col-span-2 text-xs text-slate-500 truncate">{l.company_name??"—"}</div>
                    <div className="col-span-2 text-xs text-slate-500 truncate">
                      {l.first_name?`${l.first_name} ${l.last_name}`:"—"}
                    </div>
                    <div className="col-span-1">
                      <span className={cx("rounded-lg px-2 py-0.5 text-xs font-medium",STATUS_COLORS[l.status])}>
                        {STAGES.find(s=>s.status===l.status)?.label}
                      </span>
                    </div>
                    <div className="col-span-1">
                      {l.source
                        ? <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{l.source}</span>
                        : <span className="text-slate-300">—</span>}
                    </div>
                    <div className="col-span-1 font-semibold text-emerald-600 text-xs">{formatEur(l.value_eur)}</div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <select className={cx("rounded-lg px-2 py-1 text-xs font-medium border-0 outline-none cursor-pointer",STATUS_COLORS[l.status])}
                        value={l.status} onChange={e=>handleStatusChange(l.id,e.target.value as LeadStatus)}>
                        {STAGES.map(s=><option key={s.status} value={s.status}>{s.label}</option>)}
                      </select>
                      <button onClick={()=>handleDelete(l.id)}
                        className="rounded-lg px-2 py-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                        <IcoTrash />
                      </button>
                    </div>
                  </div>
                ))}

                {filtered.length>0 && (
                  <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-600">
                    <div className="col-span-3">{filtered.length} lead{filtered.length>1?"s":""}</div>
                    <div className="col-span-6"/>
                    <div className="col-span-1 font-semibold text-emerald-600">
                      {formatEur(filtered.reduce((s,l)=>s+Number(l.value_eur||0),0))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {showModal && (
        <LeadModal onClose={()=>setShowModal(false)} onSave={lead=>setLeads(prev=>[lead,...prev])}
          contacts={contacts} users={users}/>
      )}
    </div>
  );
}

function SkeletonKanban() {
  return (
    <div className="flex gap-4">
      {STAGES.map(s=>(
        <div key={s.status} className="flex-shrink-0 w-64">
          <div className="h-5 w-28 animate-pulse rounded bg-slate-200 mb-3"/>
          <div className="space-y-2 rounded-2xl border border-slate-200 p-2 min-h-48">
            {Array.from({length:2}).map((_,i)=>(
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-slate-200"/>
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100"/>
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100"/>
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
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 h-10 animate-pulse"/>
      {Array.from({length:5}).map((_,i)=>(
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200"/>
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100 ml-auto"/>
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100"/>
        </div>
      ))}
    </div>
  );
}