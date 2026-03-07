"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Contact = {
  id: string; first_name: string; last_name: string; email: string;
  phone: string | null; job_title: string | null; city: string | null;
  linkedin_url: string | null; history: string | null; company_id: string | null;
  company_name?: string | null; created_at?: string; updated_at?: string;
};
type Deal = { id: string; title: string; amount: number | null; status: string; expected_close_date: string | null; };
type Task = { id: string; title: string; due_at: string | null; done: boolean; };
type Activity = { id: string; type: "note"|"email"|"appel"|"reunion"|"tache"; content: string; created_at: string; };
type EmailLog = { id: string; to_email: string; subject: string; type: string; status: "sent"|"failed"; sent_at: string; };

function cx(...xs: Array<string|false|undefined|null>) { return xs.filter(Boolean).join(" "); }

const AVATAR_COLORS = ["bg-emerald-500","bg-blue-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-indigo-500"];
function avatarColor(id: string) { return AVATAR_COLORS[(id.charCodeAt(0)+id.charCodeAt(id.length-1)) % AVATAR_COLORS.length]; }
function initials(c: Contact) { return `${c.first_name?.[0]??""}${c.last_name?.[0]??""}`.toUpperCase(); }
function fmt(n: number|null) { if (!n) return "—"; return new Intl.NumberFormat("fr-FR").format(Math.round(n))+" €"; }
function fmtDate(d: string|null) { if (!d) return "—"; return new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}); }
function timeAgo(s: string) {
  const d = Math.floor((Date.now()-new Date(s).getTime())/1000);
  if (d<60) return "À l'instant";
  if (d<3600) return `Il y a ${Math.floor(d/60)} min`;
  if (d<86400) return `Il y a ${Math.floor(d/3600)} h`;
  return new Date(s).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
}

const DEAL_COLORS: Record<string,string> = {
  prospect:"bg-slate-100 text-slate-600", qualification:"bg-amber-100 text-amber-700",
  proposition:"bg-blue-100 text-blue-700", negociation:"bg-purple-100 text-purple-700",
  gagne:"bg-emerald-100 text-emerald-700", perdu:"bg-rose-100 text-rose-700",
};

// ─── SVG Icons ───────────────────────────────────────────────
const IcoArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const IcoX = ({ size=16 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoNote = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IcoMail = ({ size=14 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IcoCheck = ({ size=14 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);
const IcoPhone = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 6.05 6.05l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const IcoMapPin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IcoLink = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IcoBuilding = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IcoPencil = ({ size=12 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcoBriefcase = ({ size=14 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const IcoCalendar = ({ size=10 }:{size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcoSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);
const IcoClipboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);
const IcoInbox = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
);
const IcoRefresh = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

const EMAIL_META: Record<string,{label:string;color:string;dot:string}> = {
  welcome:        {label:"Bienvenue",      color:"text-emerald-600", dot:"bg-emerald-500"},
  deal_won:       {label:"Deal gagné",     color:"text-amber-600",   dot:"bg-amber-500"},
  new_lead:       {label:"Nouveau lead",   color:"text-blue-600",    dot:"bg-blue-500"},
  lead_converted: {label:"Lead converti",  color:"text-emerald-600", dot:"bg-emerald-500"},
  overdue_task:   {label:"Tâche retard",   color:"text-rose-600",    dot:"bg-rose-500"},
  task_assigned:  {label:"Tâche assignée", color:"text-purple-600",  dot:"bg-purple-500"},
  password_reset: {label:"Reset mdp",      color:"text-slate-600",   dot:"bg-slate-400"},
  role_changed:   {label:"Rôle modifié",   color:"text-violet-600",  dot:"bg-violet-500"},
  account_status: {label:"Statut compte",  color:"text-slate-600",   dot:"bg-slate-400"},
  other:          {label:"Email",          color:"text-slate-600",   dot:"bg-slate-400"},
};

const ACTIVITY_CONFIG: Record<string,{label:string;color:string;bg:string}> = {
  note:    {label:"Note",    color:"text-slate-600",   bg:"bg-slate-100"},
  email:   {label:"Email",   color:"text-blue-600",    bg:"bg-blue-100"},
  appel:   {label:"Appel",   color:"text-emerald-600", bg:"bg-emerald-100"},
  reunion: {label:"Réunion", color:"text-amber-600",   bg:"bg-amber-100"},
  tache:   {label:"Tâche",   color:"text-violet-600",  bg:"bg-violet-100"},
};

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams<{id:string}>();
  const id = params?.id;
  const token = useMemo(() => typeof window==="undefined" ? null : localStorage.getItem("token"), []);

  const [contact,   setContact]   = useState<Contact|null>(null);
  const [deals,     setDeals]     = useState<Deal[]>([]);
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string|null>(null);
  const [activeTab,  setActiveTab]  = useState<"apropos"|"activites">("apropos");
  const [rightPanel, setRightPanel] = useState<"deals"|"emails">("deals");
  const [noteText,   setNoteText]   = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editField,  setEditField]  = useState<string|null>(null);
  const [editValue,  setEditValue]  = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo,        setEmailTo]        = useState("");
  const [emailSubject,   setEmailSubject]   = useState("");
  const [emailBody,      setEmailBody]      = useState("");
  const [sendingEmail,   setSendingEmail]   = useState(false);
  const [emailSuccess,   setEmailSuccess]   = useState(false);

  function getToken() { const t=localStorage.getItem("token"); if(!t){router.push("/login");return null;} return t; }

  async function load() {
    if (!id) return;
    setLoading(true);
    const t = getToken(); if (!t) return;
    const h = { Authorization: `Bearer ${t}` };
    try {
      const [cr,dr,tr,er] = await Promise.all([
        fetch(`${API}/contacts/${id}`,         {headers:h}),
        fetch(`${API}/deals?contact_id=${id}`, {headers:h}),
        fetch(`${API}/tasks?contact_id=${id}`, {headers:h}),
        fetch(`${API}/contacts/${id}/emails`,  {headers:h}),
      ]);
      if (cr.ok) setContact(await cr.json()); else throw new Error("Contact introuvable");
      if (dr.ok) { const d=await dr.json(); setDeals(Array.isArray(d)?d:[]); }
      if (tr.ok) { const d=await tr.json(); setTasks(Array.isArray(d)?d:[]); }
      if (er.ok) { const d=await er.json(); setEmailLogs(Array.isArray(d)?d:[]); }
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function reloadEmails() {
    if (!id) return;
    const t = getToken(); if (!t) return;
    try {
      const er = await fetch(`${API}/contacts/${id}/emails`, { headers: { Authorization: `Bearer ${t}` } });
      if (er.ok) { const d=await er.json(); setEmailLogs(Array.isArray(d)?d:[]); }
    } catch {}
  }

  useEffect(() => { if (!token){router.push("/login");return;} load(); }, [id]);

  async function submitNote() {
    if (!noteText.trim()||!contact) return;
    setSavingNote(true);
    const t=getToken(); if(!t) return;
    try {
      await fetch(`${API}/contacts/${contact.id}/notes`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({content:noteText.trim()})});
      setActivities(p=>[{id:Date.now().toString(),type:"note",content:noteText.trim(),created_at:new Date().toISOString()},...p]);
      setNoteText(""); setActiveTab("activites");
    } catch{} finally{setSavingNote(false);}
  }

  async function sendEmail() {
    if (!contact || !emailSubject.trim() || !emailBody.trim()) return;
    setSendingEmail(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/emails/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          to_email:   emailTo.trim(),
          to_name:    `${contact.first_name} ${contact.last_name}`,
          subject:    emailSubject.trim(),
          body:       emailBody.trim(),
          contact_id: contact.id,
        }),
      });
      if (res.ok) {
        setShowEmailModal(false);
        setEmailTo(""); setEmailSubject(""); setEmailBody("");
        setRightPanel("emails");
        setEmailSuccess(true);
        setTimeout(() => setEmailSuccess(false), 3000);
        setTimeout(() => reloadEmails(), 600);
      }
    } catch {} finally { setSendingEmail(false); }
  }

  function startEdit(field:string,value:string|null){setEditField(field);setEditValue(value??"");}
  async function saveEdit() {
    if (!contact||!editField) return;
    setSavingEdit(true);
    const t=getToken(); if(!t) return;
    try {
      const u={...contact,[editField]:editValue||null};
      const res=await fetch(`${API}/contacts/${contact.id}`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({first_name:u.first_name,last_name:u.last_name,email:u.email,phone:u.phone,job_title:u.job_title,city:u.city,linkedin_url:u.linkedin_url,history:u.history,company_id:u.company_id})});
      if(res.ok) setContact(p=>p?{...p,[editField]:editValue||null}:p);
    } catch{} finally{setSavingEdit(false);setEditField(null);}
  }

  function EditableField({field,label,value,type="text"}:{field:string;label:string;value:string|null;type?:string}) {
    const isEditing=editField===field;
    return (
      <div className="group">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input autoFocus type={type}
              className="flex-1 rounded-lg border border-emerald-400 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-100"
              value={editValue} onChange={e=>setEditValue(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")setEditField(null);}}/>
            <button onClick={saveEdit} disabled={savingEdit}
              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50">
              {savingEdit?"...":"✓"}
            </button>
            <button onClick={()=>setEditField(null)} className="text-slate-400 hover:text-slate-600"><IcoX size={12}/></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-h-[28px]">
            <span className={cx("text-sm",value?"text-slate-800":"text-slate-300")}>{value||"—"}</span>
            <button onClick={()=>startEdit(field,value)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-600 transition-all">
              <IcoPencil />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin text-emerald-600"><IcoRefresh /></div>
    </div>
  );
  if (error||!contact) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-600">{error??"Contact introuvable"}</p>
        <button onClick={()=>router.push("/contacts")} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white">Retour</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Toast succès email */}
      {emailSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <IcoCheck /> Email envoyé avec succès !
        </div>
      )}

      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 text-sm">
        <button onClick={()=>router.push("/contacts")} className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 font-medium transition-colors">
          <IcoArrowLeft /> Contacts
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-semibold">{contact.first_name} {contact.last_name}</span>
        <div className="ml-auto flex items-center gap-2">
          {[
            {label:"Note",  icon:<IcoNote />,           action:()=>{setNoteText("");setActiveTab("activites");}},
            {label:"Email", icon:<IcoMail />,            action:()=>{setEmailTo(contact.email);setShowEmailModal(true);}},
            {label:"Tâche", icon:<IcoCheck size={13}/>,  action:()=>router.push("/tasks")},
          ].map(btn=>(
            <button key={btn.label} onClick={btn.action}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-emerald-300 transition-colors">
              <span className="text-slate-400">{btn.icon}</span>
              <span>{btn.label}</span>
            </button>
          ))}
          <button onClick={()=>router.push("/contacts")}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 flex items-center justify-center">
            <IcoX size={13}/>
          </button>
        </div>
      </div>

      <div className="flex gap-0 h-[calc(100vh-49px)]">

        {/* COL 1 */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-5 border-b border-slate-100">
            <div className="flex flex-col items-center text-center">
              <div className={cx("w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3",avatarColor(contact.id))}>
                {initials(contact)}
              </div>
              <h1 className="text-lg font-bold text-slate-900">{contact.first_name} {contact.last_name}</h1>
              {contact.job_title && <p className="text-sm text-slate-500 mt-0.5">{contact.job_title}</p>}
              {contact.company_name && (
                <button onClick={()=>router.push("/entreprises")}
                  className="mt-1 text-sm text-emerald-600 hover:underline font-medium flex items-center gap-1">
                  <IcoBuilding /> {contact.company_name}
                </button>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="mt-2 text-xs text-blue-500 hover:underline">
                  {contact.email} ↗
                </a>
              )}
            </div>
          </div>

          <div className="p-5 border-b border-slate-100 space-y-3">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Coordonnées</p>
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="text-slate-400"><IcoPhone /></span>
                <a href={`tel:${contact.phone}`} className="hover:text-emerald-600">{contact.phone}</a>
              </div>
            )}
            {contact.city && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="text-slate-400"><IcoMapPin /></span>{contact.city}
              </div>
            )}
            {contact.linkedin_url && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400"><IcoLink /></span>
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">LinkedIn ↗</a>
              </div>
            )}
          </div>

          <div className="p-5 border-b border-slate-100">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3">Résumé</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {label:"Deals",    value:deals.length,                   color:"text-blue-600"},
                {label:"Tâches",   value:tasks.length,                   color:"text-violet-600"},
                {label:"Emails",   value:emailLogs.length,               color:"text-emerald-600"},
                {label:"Terminés", value:tasks.filter(t=>t.done).length, color:"text-emerald-600"},
              ].map(s=>(
                <div key={s.label} className="rounded-xl bg-slate-50 p-2.5 text-center">
                  <p className={cx("text-lg font-bold",s.color)}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">Informations</p>
            <div className="text-xs text-slate-500 space-y-1">
              <p>Créé le <span className="text-slate-700 font-medium">{fmtDate(contact.created_at??null)}</span></p>
              {contact.updated_at && <p>Modifié le <span className="text-slate-700 font-medium">{fmtDate(contact.updated_at)}</span></p>}
            </div>
          </div>
        </aside>

        {/* COL 2 */}
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-1 sticky top-0 z-10">
            {([{id:"apropos",label:"À propos"},{id:"activites",label:"Activités"}] as const).map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                className={cx("px-5 py-3.5 text-sm font-medium border-b-2 transition-all -mb-px",
                  activeTab===tab.id?"border-emerald-500 text-emerald-700":"border-transparent text-slate-500 hover:text-slate-700")}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-5">
            {activeTab==="apropos" && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800">Détails du contact</h3>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <IcoPencil size={10}/> Cliquer sur un champ pour modifier
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <EditableField field="first_name"   label="Prénom"     value={contact.first_name}/>
                    <EditableField field="last_name"    label="Nom"        value={contact.last_name}/>
                    <EditableField field="email"        label="E-mail"     value={contact.email} type="email"/>
                    <EditableField field="phone"        label="Téléphone"  value={contact.phone}/>
                    <EditableField field="job_title"    label="Poste"      value={contact.job_title}/>
                    <EditableField field="city"         label="Ville"      value={contact.city}/>
                    <EditableField field="linkedin_url" label="LinkedIn"   value={contact.linkedin_url}/>
                    <EditableField field="company_name" label="Entreprise" value={contact.company_name??null}/>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Notes internes</h3>
                  {contact.history
                    ? <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-3">{contact.history}</p>
                    : <p className="text-sm text-slate-400 italic">Aucune note pour ce contact.</p>}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="text-slate-400"><IcoMail size={15}/></span>
                    Abonnements aux communications
                  </h3>
                  <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 mb-3">
                    <p className="text-sm text-slate-600">Gérez les types de communications que ce contact accepte de recevoir.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {["Newsletter","Promotions","Rappels"].map(label=>(
                      <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <div className="w-3 h-3 rounded-full bg-slate-200"/>
                        <span className="text-xs text-slate-600">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab==="activites" && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Ajouter une note</p>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
                    rows={3} placeholder="Écrivez une note..." value={noteText} onChange={e=>setNoteText(e.target.value)}/>
                  <div className="flex justify-end mt-2">
                    <button onClick={submitNote} disabled={!noteText.trim()||savingNote}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
                      <IcoSave /> {savingNote ? "Enregistrement..." : "Enregistrer la note"}
                    </button>
                  </div>
                </div>

                {activities.length===0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <IcoClipboard />
                    </div>
                    <p className="text-sm text-slate-500">Aucune activité enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map(act => {
                      const cfg = ACTIVITY_CONFIG[act.type] ?? ACTIVITY_CONFIG.note;
                      return (
                        <div key={act.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3">
                          <div className={cx("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",cfg.bg,cfg.color)}>
                            {act.type[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cx("text-xs font-semibold",cfg.color)}>{cfg.label}</span>
                              <span className="text-xs text-slate-400">
                                {new Date(act.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
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

        {/* COL 3 */}
        <aside className="w-80 flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto">
          <div className="flex border-b border-slate-200 sticky top-0 bg-white z-10">
            <button onClick={()=>setRightPanel("deals")}
              className={cx("flex-1 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
                rightPanel==="deals"?"text-emerald-700 border-b-2 border-emerald-500":"text-slate-400 hover:text-slate-600")}>
              <IcoBriefcase size={12}/> Deals & Tâches
            </button>
            <button onClick={()=>setRightPanel("emails")}
              className={cx("flex-1 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
                rightPanel==="emails"?"text-emerald-700 border-b-2 border-emerald-500":"text-slate-400 hover:text-slate-600")}>
              <IcoMail size={12}/> Emails
              {emailLogs.length>0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                  {emailLogs.length}
                </span>
              )}
            </button>
          </div>

          {rightPanel==="deals" && (
            <>
              <div className="border-b border-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400"><IcoBriefcase /></span>
                    <span className="text-sm font-semibold text-slate-800">Transactions</span>
                    <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-bold">{deals.length}</span>
                  </div>
                  <button onClick={()=>router.push("/pipeline")} className="text-xs text-emerald-600 hover:underline">+ Ajouter</button>
                </div>
                <div className="px-4 pb-4 space-y-2">
                  {deals.length===0 ? (
                    <div className="text-center py-6"><p className="text-xs text-slate-400">Aucune transaction</p></div>
                  ) : deals.map(deal=>(
                    <div key={deal.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-xs font-semibold text-slate-800 flex-1">{deal.title}</p>
                        <span className={cx("text-[10px] px-2 py-0.5 rounded-lg font-medium",DEAL_COLORS[deal.status]??"bg-slate-100 text-slate-600")}>{deal.status}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">{fmt(deal.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b border-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400"><IcoCheck size={13}/></span>
                    <span className="text-sm font-semibold text-slate-800">Tâches</span>
                    <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-bold">{tasks.filter(t=>!t.done).length}</span>
                  </div>
                  <button onClick={()=>router.push("/tasks")} className="text-xs text-emerald-600 hover:underline">+ Ajouter</button>
                </div>
                <div className="px-4 pb-4 space-y-2">
                  {tasks.slice(0,5).map(task=>(
                    <div key={task.id} className={cx("rounded-xl border p-3 flex items-start gap-2.5",task.done?"border-emerald-100 bg-emerald-50/50":"border-slate-200")}>
                      <div className={cx("w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 text-[8px] font-bold",task.done?"border-emerald-500 bg-emerald-500 text-white":"border-slate-300")}>
                        {task.done&&"✓"}
                      </div>
                      <div className="flex-1">
                        <p className={cx("text-xs font-medium truncate",task.done&&"line-through text-slate-400")}>{task.title}</p>
                        {task.due_at && (
                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <IcoCalendar /> {new Date(task.due_at).toLocaleDateString("fr-FR")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-4 py-3 text-center">
                <button onClick={()=>router.push("/leads")} className="text-xs text-emerald-600 hover:underline">
                  Voir les leads associés →
                </button>
              </div>
            </>
          )}

          {rightPanel==="emails" && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600">{emailLogs.length}</p>
                  <p className="text-[10px] text-slate-400">Total envoyés</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-rose-500">{emailLogs.filter(e=>e.status==="failed").length}</p>
                  <p className="text-[10px] text-slate-400">Échecs</p>
                </div>
              </div>

              {emailLogs.length===0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <IcoInbox />
                  </div>
                  <p className="text-sm text-slate-500">Aucun email envoyé</p>
                  <p className="text-xs text-slate-400 mt-1">Les emails apparaîtront ici après envoi.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {emailLogs.map(log=>{
                    const meta = EMAIL_META[log.type] || EMAIL_META["other"];
                    return (
                      <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={cx("w-2 h-2 rounded-full flex-shrink-0 mt-0.5", meta.dot)}/>
                            <span className={cx("text-xs font-semibold",meta.color)}>{meta.label}</span>
                          </div>
                          <span className={cx("text-[10px] px-1.5 py-0.5 rounded-md font-medium",log.status==="sent"?"bg-emerald-100 text-emerald-700":"bg-rose-100 text-rose-700")}>
                            {log.status==="sent" ? "Envoyé" : "Échec"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 truncate">{log.subject}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(log.sent_at)}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <button onClick={()=>router.push("/emails")} className="w-full text-xs text-slate-400 hover:text-emerald-600 py-1">
                  Voir tout l'historique →
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Modal Email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={e=>{if(e.target===e.currentTarget)setShowEmailModal(false);}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="text-slate-500"><IcoMail size={16}/></span> Envoyer un email
              </h2>
              <button onClick={()=>setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600">
                <IcoX />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">À (destinataire)</label>
              <input type="email" placeholder="email@exemple.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                value={emailTo} onChange={e=>setEmailTo(e.target.value)}/>
            </div>
            <input type="text" placeholder="Objet de l'email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              value={emailSubject} onChange={e=>setEmailSubject(e.target.value)}/>
            <textarea placeholder="Contenu de l'email..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
              rows={7} value={emailBody} onChange={e=>setEmailBody(e.target.value)}/>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={()=>setShowEmailModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={sendEmail}
                disabled={!emailTo.trim()||!emailSubject.trim()||!emailBody.trim()||sendingEmail}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                <IcoSend /> {sendingEmail ? "Envoi en cours..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}