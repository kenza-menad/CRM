// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";

// const API = process.env.NEXT_PUBLIC_API_URL!;

// type DealStatus = "prospect" | "qualification" | "proposition" | "negociation" | "gagne" | "perdu";
// type Period = "today" | "7d" | "30d" | "month" | "year" | "custom";

// type ActivityItem = {
//   id: string; type: "deal" | "lead" | "contact" | "task" | "company";
//   action: string; title: string; user: string; at: string;
// };

// type MyActivity = {
//   my_deals: { id: string; title: string; status: DealStatus; amount: number; updated_at: string }[];
//   my_leads: { id: string; title: string; status: string; value_eur: number | null; created_at: string }[];
//   my_tasks: { id: string; title: string; due_at: string | null; done: boolean }[];
//   my_contacts: { id: string; first_name: string; last_name: string; created_at: string }[];
// };

// type DashboardData = {
//   period: { startDate: string; endDate: string };
//   kpi: {
//     ca_gagne: number; ca_gagne_evol: number | null;
//     pipeline_total: number;
//     total_leads: number; total_leads_evol: number | null;
//     taux_conversion: number;
//     tasks_todo: number; tasks_overdue: number;
//     total_deals: number; total_deals_evol: number | null;
//   };
//   deals_by_status: Record<DealStatus, number>;
//   deals_by_status_global: Record<DealStatus, number>;
//   leads_by_status: { nouveau: number; en_cours: number; converti: number; perdu: number };
//   recent_deals: { id: string; title: string; status: DealStatus; amount: number; first_name: string | null; last_name: string | null }[];
//   recent_leads: { id: string; title: string; status: string; value_eur: number | null; first_name: string | null; last_name: string | null }[];
//   today_tasks: { id: string; title: string; due_at: string | null; done: boolean; priority?: string }[];
//   monthly_sales: { month: string; count: number; total: number }[];
//   commerciaux: { id: string; first_name: string; last_name: string; total_deals: number; deals_gagnes: number; ca: number; tasks_open: number }[];
// };

// const PERIODS: { key: Period; label: string }[] = [
//   { key: "today", label: "Aujourd'hui" }, { key: "7d", label: "7 jours" },
//   { key: "30d", label: "30 jours" }, { key: "month", label: "Ce mois" },
//   { key: "year", label: "Cette année" }, { key: "custom", label: "Personnalisé" },
// ];

// const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
//   prospect: "Prospect", qualification: "Qualification", proposition: "Proposition",
//   negociation: "Négociation", gagne: "Gagné", perdu: "Perdu",
// };
// const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
//   prospect: "#94a3b8", qualification: "#fbbf24", proposition: "#60a5fa",
//   negociation: "#a78bfa", gagne: "#10b981", perdu: "#f87171",
// };

// function cx(...xs: Array<string | false | undefined | null>) { return xs.filter(Boolean).join(" "); }
// function fmt(n: number) { return new Intl.NumberFormat("fr-FR").format(Math.round(n)); }
// function timeAgo(dateStr: string) {
//   const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
//   if (diff < 60) return "À l'instant";
//   if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
//   if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
//   return `Il y a ${Math.floor(diff / 86400)} j`;
// }
// function getUserName(): string {
//   try {
//     const token = localStorage.getItem("token");
//     if (!token) return "";
//     const payload = JSON.parse(atob(token.split(".")[1]));
//     return payload.name || payload.email || "";
//   } catch { return ""; }
// }

// const TYPE_LABELS: Record<string, string> = {
//   deal: "Transaction", lead: "Lead", contact: "Contact", task: "Tâche", company: "Entreprise",
// };

// const TYPE_ROUTES: Record<string, string> = {
//   deal: "/deals", lead: "/leads", contact: "/contacts", task: "/tasks", company: "/entreprises",
// };

// function ActivityCard({ item, userName }: { item: ActivityItem; userName: string }) {
//   const router = useRouter();
//   const typeLabel = TYPE_LABELS[item.type] ?? item.type;
//   const badge = item.type === "lead" ? "Lead" : item.type === "contact" ? "Opportunité" : null;
//   const route = TYPE_ROUTES[item.type];

//   return (
//     <div
//       onClick={() => route && router.push(route)}
//       className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all flex flex-col gap-3 flex-shrink-0"
//       style={{ width: "210px", minHeight: "140px" }}
//     >
//       <div className="flex items-center gap-2">
//         <span className="text-xs text-slate-500">{typeLabel}</span>
//         {badge && (
//           <span className="text-xs bg-blue-600 text-white rounded-full px-2.5 py-0.5 font-medium">{badge}</span>
//         )}
//       </div>
//       <div className="flex-1">
//         <div className="text-sm font-bold text-slate-900 underline leading-snug line-clamp-3">{item.title}</div>
//         <div className="text-xs text-slate-400 mt-1.5">
//           {item.action} (par {item.user === userName ? "vous" : item.user}) {timeAgo(item.at)}
//         </div>
//       </div>
//     </div>
//   );
// }

// type KpiAccent = "emerald" | "blue" | "amber" | "rose" | "slate";
// const ACCENT_MAP: Record<KpiAccent, { dot: string; value: string }> = {
//   emerald: { dot: "bg-emerald-500", value: "text-slate-900" },
//   blue: { dot: "bg-blue-500", value: "text-slate-900" },
//   amber: { dot: "bg-amber-500", value: "text-slate-900" },
//   rose: { dot: "bg-rose-500", value: "text-rose-600" },
//   slate: { dot: "bg-slate-300", value: "text-slate-900" },
// };
// function KpiCard({ icon, label, value, sub, evol, accent }: { icon: string; label: string; value: string; sub: string; evol: number | null; accent: KpiAccent; }) {
//   const a = ACCENT_MAP[accent];
//   return (
//     <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
//       <div className="flex items-center justify-between mb-4">
//         <div className="flex items-center gap-2">
//           <div className={`h-2 w-2 rounded-full ${a.dot}`} />
//           <span className="text-xs font-medium text-slate-500">{label}</span>
//         </div>
//         <span className="text-base">{icon}</span>
//       </div>
//       <div className={`text-2xl font-bold mb-1 ${a.value}`}>{value}</div>
//       <div className="flex items-center justify-between">
//         <span className="text-xs text-slate-400">{sub}</span>
//         {evol !== null && evol !== undefined && (
//           <span className={`text-xs font-semibold rounded-md px-1.5 py-0.5 ${evol >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
//             {evol >= 0 ? "↑" : "↓"} {Math.abs(evol)}%
//           </span>
//         )}
//       </div>
//     </div>
//   );
// }

// function CaChart({ sales }: { sales: { month: string; count: number; total: number }[] }) {
//   const W = 560, H = 160, PAD_L = 48, PAD_R = 16, PAD_T = 16, PAD_B = 32;
//   const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
//   const maxVal = Math.max(1, ...sales.map(m => Number(m.total)));
//   const points = sales.map((m, i) => ({
//     x: PAD_L + (i / Math.max(sales.length - 1, 1)) * chartW,
//     y: PAD_T + chartH - ((Number(m.total) / maxVal) * chartH), m,
//   }));
//   const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
//   const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${PAD_T + chartH} L ${points[0].x.toFixed(1)} ${PAD_T + chartH} Z`;
//   return (
//     <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible">
//       <defs>
//         <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
//           <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
//           <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
//         </linearGradient>
//       </defs>
//       {[0, 25, 50, 75, 100].map(pct => {
//         const y = PAD_T + ((100 - pct) / 100) * chartH;
//         const val = maxVal * pct / 100;
//         return (
//           <g key={pct}>
//             <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke={pct === 0 ? "#e2e8f0" : "#f1f5f9"} strokeWidth="1" />
//             <text x={PAD_L - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="#cbd5e1">{val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}</text>
//           </g>
//         );
//       })}
//       <path d={areaD} fill="url(#grad)" />
//       <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//       {points.map((p, i) => (
//         <g key={i} className="group" style={{ cursor: "pointer" }}>
//           <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
//           <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#10b981" strokeWidth="2" className="opacity-0 group-hover:opacity-100 transition-opacity" />
//           <g className="opacity-0 group-hover:opacity-100 transition-opacity">
//             <rect x={p.x - 40} y={p.y - 36} width="80" height="24" rx="5" fill="#1e293b" />
//             <text x={p.x} y={p.y - 21} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">{new Intl.NumberFormat("fr-FR").format(Math.round(Number(p.m.total)))} €</text>
//             <text x={p.x} y={p.y - 11} textAnchor="middle" fontSize="8" fill="#94a3b8">{p.m.count} deal{Number(p.m.count) > 1 ? "s" : ""}</text>
//           </g>
//           <text x={p.x} y={H - 2} textAnchor="middle" fontSize="8" fill="#94a3b8">
//             {(() => { const [y, mo] = p.m.month.split("-"); return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("fr-FR", { month: "short" }); })()}
//           </text>
//         </g>
//       ))}
//     </svg>
//   );
// }

// function SkeletonDashboard() {
//   return (
//     <div className="space-y-6 animate-pulse">
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//         {Array.from({ length: 4 }).map((_, i) => (
//           <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 h-28">
//             <div className="h-3 w-24 rounded bg-slate-200 mb-4" /><div className="h-7 w-20 rounded bg-slate-200 mb-2" /><div className="h-2 w-16 rounded bg-slate-100" />
//           </div>
//         ))}
//       </div>
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//         {Array.from({ length: 3 }).map((_, i) => (
//           <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 h-36">
//             <div className="h-3 w-28 rounded bg-slate-200 mb-3" /><div className="h-6 w-32 rounded bg-slate-200 mb-2" /><div className="h-2 w-full rounded bg-slate-100 mt-4" />
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// export default function DashboardPage() {
//   const router = useRouter();
//   const [data, setData] = useState<DashboardData | null>(null);
//   const [activity, setActivity] = useState<ActivityItem[]>([]);
//   const [myActivity, setMyActivity] = useState<MyActivity | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [period, setPeriod] = useState<Period>("month");
//   const [customStart, setCustomStart] = useState("");
//   const [customEnd, setCustomEnd] = useState("");
//   const [userName, setUserName] = useState("");

//   useEffect(() => { setUserName(getUserName()); }, []);

//   function getToken() {
//     const t = localStorage.getItem("token");
//     if (!t) { router.push("/login"); return null; }
//     return t;
//   }

//   const loadDashboard = useCallback(async (p: Period = period, cs = customStart, ce = customEnd) => {
//     setError(null); setLoading(true);
//     const t = getToken(); if (!t) return;
//     try {
//       let url = `${API}/dashboard/stats?period=${p}`;
//       if (p === "custom" && cs && ce) url = `${API}/dashboard/stats?start=${cs}&end=${ce}`;
//       const [res, actRes, myRes] = await Promise.all([
//         fetch(url, { headers: { Authorization: `Bearer ${t}` } }),
//         fetch(`${API}/dashboard/activity`, { headers: { Authorization: `Bearer ${t}` } }),
//         fetch(`${API}/dashboard/my-activity`, { headers: { Authorization: `Bearer ${t}` } }),
//       ]);
//       const json = await res.json().catch(() => null);
//       const actJson = await actRes.json().catch(() => []);
//       const myJson = await myRes.json().catch(() => null);
//       if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
//       setData(json);
//       setActivity(Array.isArray(actJson) ? actJson : []);
//       setMyActivity(myJson);
//     } catch (e: any) { setError(e.message); }
//     finally { setLoading(false); }
//   }, [period, customStart, customEnd]);

//   useEffect(() => {
//     const t = localStorage.getItem("token");
//     if (!t) { router.push("/login"); return; }
//     loadDashboard();
//   }, []);

//   function handlePeriod(p: Period) {
//     setPeriod(p);
//     if (p !== "custom") loadDashboard(p);
//   }

//   const totalDealsStatus = useMemo(() =>
//     data ? Object.values(data.deals_by_status).reduce((a, b) => a + b, 0) : 0, [data]);

//   const OBJECTIF = 80000;
//   const objectifPct = data ? Math.min(100, Math.round((data.kpi.ca_gagne / OBJECTIF) * 100)) : 0;

//   const funnelSteps = useMemo(() => {
//     if (!data) return [];
//     const { nouveau, en_cours, converti, perdu } = data.leads_by_status;
//     const total = nouveau + en_cours + converti + perdu;
//     return [
//       { key: "total",    label: "Leads entrés",  count: total,    color: "#6366f1", pct: 100 },
//       { key: "en_cours", label: "En cours",       count: en_cours, color: "#f59e0b", pct: total > 0 ? Math.round((en_cours / total) * 100) : 0 },
//       { key: "converti", label: "Convertis",      count: converti, color: "#10b981", pct: total > 0 ? Math.round((converti / total) * 100) : 0 },
//       { key: "perdu",    label: "Perdus",         count: perdu,    color: "#f87171", pct: total > 0 ? Math.round((perdu / total) * 100) : 0 },
//     ];
//   }, [data]);

//   const now = new Date();
//   const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";

//   return (
//     <div className="min-h-screen bg-slate-50">
//       <div className="flex">
//         <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-slate-200 md:bg-white">
//           <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
//             <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center">
//               <span className="text-white font-bold text-sm">F</span>
//             </div>
//             <div>
//               <div className="text-sm font-semibold text-slate-900">FormaPro CRM</div>
//               <div className="text-xs text-slate-400">Agence de Formation</div>
//             </div>
//           </div>
//           <div className="flex-1 px-3 py-4 overflow-y-auto">
//             <div className="mb-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation</div>
//             <nav className="space-y-0.5 text-sm">
//               {[
//                 { label: "Dashboard", path: "/dashboard", active: true, icon: "📊" },
//                 { label: "Contacts", path: "/contacts", icon: "👤" },
//                 { label: "Entreprises", path: "/entreprises", icon: "🏢" },
//                 { label: "Leads", path: "/leads", icon: "🎯" },
//                 { label: "Deals", path: "/deals", icon: "💼" },
//                 { label: "Pipeline", path: "/pipeline", icon: "📈" },
//                 { label: "Tâches", path: "/tasks", icon: "✅" },
//               ].map(item => (
//                 <button key={item.path} onClick={() => router.push(item.path)}
//                   className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
//                     item.active ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-600 hover:bg-slate-50")}>
//                   <span className="text-base">{item.icon}</span><span>{item.label}</span>
//                 </button>
//               ))}
//               <div className="pt-3 mt-3 border-t border-slate-100">
//                 <button onClick={() => router.push("/users")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-600 hover:bg-slate-50">
//                   <span>👥</span><span>Utilisateurs</span>
//                 </button>
//               </div>
//             </nav>
//           </div>
//         </aside>

//         <main className="flex-1 min-w-0 overflow-hidden">
//           <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
//             <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
//               <div>
//                 <h1 className="text-xl font-bold text-slate-900">{greeting}{userName ? `, ${userName}` : ""} 👋</h1>
//                 <p className="text-sm text-slate-400 mt-0.5">Voici le résumé de votre activité commerciale.</p>
//               </div>
//               <div className="flex items-center gap-2">
//                 <div className="flex flex-wrap gap-1">
//                   {PERIODS.map(p => (
//                     <button key={p.key} onClick={() => handlePeriod(p.key)}
//                       className={cx("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
//                         period === p.key ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
//                       {p.label}
//                     </button>
//                   ))}
//                 </div>
//                 <button onClick={() => loadDashboard()} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors">⟳</button>
//               </div>
//             </div>
//             {period === "custom" && (
//               <div className="px-6 pb-3 flex items-center gap-2">
//                 <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-400" />
//                 <span className="text-slate-400 text-xs">→</span>
//                 <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-400" />
//                 <button onClick={() => loadDashboard("custom", customStart, customEnd)} disabled={!customStart || !customEnd} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40 hover:bg-emerald-700">Appliquer</button>
//               </div>
//             )}
//           </div>

//           <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto">
//             {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">⚠️ {error}</div>}

//             {loading ? <SkeletonDashboard /> : !data ? null : (
//               <>
//                 {/* KPIs */}
//                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//                   <KpiCard icon="💰" label="CA encaissé" value={`${fmt(data.kpi.ca_gagne)} €`} sub="Formations vendues" evol={data.kpi.ca_gagne_evol} accent="emerald" />
//                   <KpiCard icon="🔄" label="Taux de conversion" value={`${data.kpi.taux_conversion}%`} sub="Leads → Gagné" evol={null} accent={data.kpi.taux_conversion >= 20 ? "emerald" : "amber"} />
//                   <KpiCard icon="🎯" label="Nouveaux prospects" value={String(data.kpi.total_leads)} sub="Leads sur la période" evol={data.kpi.total_leads_evol} accent="blue" />
//                   <KpiCard icon="⚠️" label="Tâches en retard" value={String(data.kpi.tasks_overdue)} sub="À traiter en priorité" evol={null} accent={data.kpi.tasks_overdue > 0 ? "rose" : "slate"} />
//                 </div>

//                 {/* Objectif + Pipeline + Tâches */}
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//                   <div className="rounded-2xl border border-slate-200 bg-white p-5">
//                     <div className="flex items-center justify-between mb-1">
//                       <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Objectif du mois</span>
//                       <span className="text-xs font-bold text-emerald-600">{objectifPct}% atteint</span>
//                     </div>
//                     <div className="text-2xl font-bold text-slate-900 mb-1">{fmt(data.kpi.ca_gagne)} €</div>
//                     <div className="text-xs text-slate-400 mb-3">sur {fmt(OBJECTIF)} € d'objectif</div>
//                     <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
//                       <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${objectifPct}%` }} />
//                     </div>
//                     <div className="flex justify-between text-xs text-slate-400 mt-1.5"><span>0 €</span><span>{fmt(OBJECTIF)} €</span></div>
//                   </div>

//                   <div className="rounded-2xl border border-slate-200 bg-white p-5">
//                     <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pipeline commercial</div>
//                     <div className="text-2xl font-bold text-slate-900 mb-1">{fmt(data.kpi.pipeline_total)} €</div>
//                     <div className="text-xs text-slate-400 mb-3">CA prévisionnel en cours</div>
//                     <div className="space-y-2">
//                       {(["qualification", "proposition", "negociation"] as DealStatus[]).map(s => {
//                         const count = data.deals_by_status[s] ?? 0;
//                         const pct = totalDealsStatus > 0 ? Math.round((count / totalDealsStatus) * 100) : 0;
//                         return (
//                           <div key={s} className="flex items-center gap-2">
//                             <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DEAL_STATUS_COLORS[s] }} />
//                             <span className="text-xs text-slate-600 flex-1">{DEAL_STATUS_LABELS[s]}</span>
//                             <span className="text-xs font-semibold text-slate-700">{count}</span>
//                             <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
//                           </div>
//                         );
//                       })}
//                     </div>
//                   </div>

//                   <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
//                     <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
//                       <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tâches urgentes</span>
//                       <button onClick={() => router.push("/tasks")} className="text-xs text-emerald-600 hover:underline">Voir toutes →</button>
//                     </div>
//                     {data.today_tasks.length === 0 ? (
//                       <div className="flex flex-col items-center justify-center p-6 text-center">
//                         <div className="text-2xl mb-1">🎉</div>
//                         <div className="text-xs text-slate-400">Aucune tâche urgente</div>
//                       </div>
//                     ) : (
//                       <div className="divide-y divide-slate-50">
//                         {data.today_tasks.slice(0, 4).map(task => {
//                           const isLate = task.due_at && new Date(task.due_at) < new Date();
//                           const isUrgent = task.priority === "urgent";
//                           return (
//                             <div key={task.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
//                               <div className={cx("h-1.5 w-1.5 rounded-full flex-shrink-0",
//                                 isUrgent ? "bg-orange-500" : isLate ? "bg-rose-500" : "bg-amber-400"
//                               )} />
//                               <div className="flex-1 min-w-0">
//                                 <div className="text-xs font-medium text-slate-800 truncate">{task.title}</div>
//                                 <div className="flex items-center gap-1.5 mt-0.5">
//                                   {isUrgent && (
//                                     <span className="text-[10px] bg-orange-100 text-orange-700 rounded px-1.5 py-0.5 font-medium">🔴 Urgent</span>
//                                   )}
//                                   {task.due_at && (
//                                     <span className={cx("text-[10px]", isLate ? "text-rose-500" : "text-slate-400")}>
//                                       {isLate ? "En retard · " : ""}{new Date(task.due_at).toLocaleDateString("fr-FR")}
//                                     </span>
//                                   )}
//                                   {!task.due_at && !isUrgent && <span className="text-[10px] text-slate-400">Pas d'échéance</span>}
//                                 </div>
//                               </div>
//                             </div>
//                           );
//                         })}
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {/* Graphique CA + Répartition deals */}
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                   <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
//                     <div className="flex items-center justify-between mb-6">
//                       <div>
//                         <h2 className="text-sm font-semibold text-slate-900">Évolution du CA mensuel</h2>
//                         <p className="text-xs text-slate-400 mt-0.5">12 derniers mois</p>
//                       </div>
//                       {data.monthly_sales.length > 0 && (
//                         <div className="text-right">
//                           <div className="text-xs text-slate-400">Total période</div>
//                           <div className="text-sm font-bold text-emerald-600">{fmt(data.monthly_sales.reduce((a, m) => a + Number(m.total), 0))} €</div>
//                         </div>
//                       )}
//                     </div>
//                     {data.monthly_sales.length === 0 ? (
//                       <div className="flex flex-col items-center justify-center h-44 text-slate-300">
//                         <div className="text-4xl mb-2">📊</div>
//                         <div className="text-sm">Aucune vente sur cette période</div>
//                       </div>
//                     ) : <CaChart sales={data.monthly_sales} />}
//                   </div>

//                   <div className="rounded-2xl border border-slate-200 bg-white p-6">
//                     <h2 className="text-sm font-semibold text-slate-900 mb-4">Répartition des deals</h2>
//                     <div className="space-y-3">
//                       {(Object.keys(DEAL_STATUS_LABELS) as DealStatus[]).map(status => {
//                         const globalData = data.deals_by_status_global ?? data.deals_by_status;
//                         const totalGlobal = Object.values(globalData).reduce((a, b) => a + b, 0);
//                         const count = globalData[status] ?? 0;
//                         const pct = totalGlobal > 0 ? Math.round((count / totalGlobal) * 100) : 0;
//                         return (
//                           <div key={status}>
//                             <div className="flex items-center justify-between mb-1">
//                               <div className="flex items-center gap-1.5">
//                                 <div className="h-2 w-2 rounded-full" style={{ backgroundColor: DEAL_STATUS_COLORS[status] }} />
//                                 <span className="text-xs text-slate-600">{DEAL_STATUS_LABELS[status]}</span>
//                               </div>
//                               <span className="text-xs font-semibold text-slate-700">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
//                             </div>
//                             <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
//                               <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: DEAL_STATUS_COLORS[status] }} />
//                             </div>
//                           </div>
//                         );
//                       })}
//                     </div>
//                     <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs">
//                       <span className="text-slate-400">Total deals</span>
//                       <span className="font-semibold text-slate-700">{Object.values(data.deals_by_status_global ?? data.deals_by_status).reduce((a, b) => a + b, 0)}</span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Entonnoir de conversion */}
//                 <div className="rounded-2xl border border-slate-200 bg-white p-6">
//                   <h2 className="text-sm font-semibold text-slate-900 mb-1">Entonnoir de conversion</h2>
//                   <p className="text-xs text-slate-400 mb-5">Progression des leads — chaque barre = % par rapport au total entré</p>
//                   <div className="space-y-4">
//                     {funnelSteps.map((step) => (
//                       <div key={step.key}>
//                         <div className="flex items-center justify-between mb-1.5">
//                           <span className="text-xs font-medium text-slate-700">{step.label}</span>
//                           <div className="flex items-center gap-2">
//                             <span className="text-xs font-bold text-slate-800">{step.count}</span>
//                             <span className="text-xs bg-slate-100 rounded-md px-1.5 py-0.5 text-slate-500 font-medium">{step.pct}%</span>
//                           </div>
//                         </div>
//                         <div className="h-7 rounded-xl bg-slate-100 overflow-hidden">
//                           <div className="h-full rounded-xl flex items-center justify-end pr-3 transition-all duration-700"
//                             style={{ width: `${Math.max(step.pct, 4)}%`, backgroundColor: step.color }}>
//                             {step.pct > 12 && <span className="text-white text-xs font-bold">{step.count}</span>}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                   {funnelSteps.length > 0 && funnelSteps[0].count > 0 && (
//                     <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
//                       <div>
//                         <span className="text-xs text-slate-500">Taux de conversion global</span>
//                         <div className="text-xs text-slate-400">{funnelSteps[2].count} converti{funnelSteps[2].count > 1 ? "s" : ""} sur {funnelSteps[0].count} leads</div>
//                       </div>
//                       <span className="text-lg font-bold text-emerald-600">{Math.round((funnelSteps[2].count / funnelSteps[0].count) * 100)}%</span>
//                     </div>
//                   )}
//                 </div>

//                 {/* Activité récente */}
//                 <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
//                   <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
//                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
//                       <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
//                     </svg>
//                     <h2 className="text-sm font-semibold text-slate-900">Activité récente</h2>
//                   </div>
//                   {activity.length === 0 ? (
//                     <div className="flex flex-col items-center justify-center p-12 text-center">
//                       <div className="text-4xl mb-3">📭</div>
//                       <div className="text-sm text-slate-400">Aucune activité récente</div>
//                     </div>
//                   ) : (
//                     <div className="p-5 flex gap-4 overflow-x-auto">
//                       {activity.map((item, i) => (
//                         <ActivityCard key={item.id + i} item={item} userName={userName} />
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {/* Mon activité */}
//                 {myActivity && (
//                   <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
//                     <div className="px-6 py-4 border-b border-slate-200">
//                       <h2 className="text-sm font-semibold text-slate-900">Mon activité</h2>
//                       <p className="text-xs text-slate-400 mt-0.5">Vos deals, leads et tâches assignés</p>
//                     </div>

//                     {myActivity.my_deals.length > 0 && (
//                       <div className="border-b border-slate-200">
//                         <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100">
//                           <span className="text-xs font-semibold text-slate-700">Deals</span>
//                           <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{myActivity.my_deals.length}</span>
//                         </div>
//                         <table className="w-full border-collapse">
//                           <thead className="bg-slate-50">
//                             <tr>
//                               <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200 w-2/5">Titre</th>
//                               <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">Statut</th>
//                               <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Montant</th>
//                               <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Modifié</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {myActivity.my_deals.map((d, i) => (
//                               <tr key={d.id}
//                                 className={cx("cursor-pointer hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
//                                 onClick={() => router.push("/deals")}>
//                                 <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{d.title}</td>
//                                 <td className="px-4 py-3.5">
//                                   <span className={cx("text-xs rounded-md px-2.5 py-1 font-medium border",
//                                     d.status === "gagne" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
//                                     d.status === "perdu" ? "bg-rose-50 text-rose-700 border-rose-200" :
//                                     d.status === "negociation" ? "bg-purple-50 text-purple-700 border-purple-200" :
//                                     d.status === "proposition" ? "bg-blue-50 text-blue-700 border-blue-200" :
//                                     d.status === "qualification" ? "bg-amber-50 text-amber-700 border-amber-200" :
//                                     "bg-slate-50 text-slate-600 border-slate-200"
//                                   )}>{DEAL_STATUS_LABELS[d.status]}</span>
//                                 </td>
//                                 <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-800">{fmt(d.amount)} €</td>
//                                 <td className="px-6 py-3.5 text-right text-xs text-slate-400">{timeAgo(d.updated_at)}</td>
//                               </tr>
//                             ))}
//                           </tbody>
//                         </table>
//                       </div>
//                     )}

//                     {myActivity.my_leads.length > 0 && (
//                       <div className="border-b border-slate-200">
//                         <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100">
//                           <span className="text-xs font-semibold text-slate-700">Leads</span>
//                           <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{myActivity.my_leads.length}</span>
//                         </div>
//                         <table className="w-full border-collapse">
//                           <thead className="bg-slate-50">
//                             <tr>
//                               <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200 w-2/5">Titre</th>
//                               <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">Statut</th>
//                               <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Valeur</th>
//                               <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Créé</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {myActivity.my_leads.map((l, i) => (
//                               <tr key={l.id}
//                                 className={cx("cursor-pointer hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
//                                 onClick={() => router.push("/leads")}>
//                                 <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{l.title}</td>
//                                 <td className="px-4 py-3.5">
//                                   <span className={cx("text-xs rounded-md px-2.5 py-1 font-medium border",
//                                     l.status === "converti" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
//                                     l.status === "perdu" ? "bg-rose-50 text-rose-700 border-rose-200" :
//                                     l.status === "en_cours" ? "bg-amber-50 text-amber-700 border-amber-200" :
//                                     "bg-blue-50 text-blue-700 border-blue-200"
//                                   )}>{l.status.replace("_", " ")}</span>
//                                 </td>
//                                 <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-800">{l.value_eur != null ? `${fmt(l.value_eur)} €` : "—"}</td>
//                                 <td className="px-6 py-3.5 text-right text-xs text-slate-400">{timeAgo(l.created_at)}</td>
//                               </tr>
//                             ))}
//                           </tbody>
//                         </table>
//                       </div>
//                     )}

//                     {myActivity.my_tasks.length > 0 && (
//                       <div className="border-b border-slate-200">
//                         <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100">
//                           <span className="text-xs font-semibold text-slate-700">Tâches en cours</span>
//                           <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{myActivity.my_tasks.length}</span>
//                         </div>
//                         <table className="w-full border-collapse">
//                           <thead className="bg-slate-50">
//                             <tr>
//                               <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200 w-2/5">Tâche</th>
//                               <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">Échéance</th>
//                               <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Statut</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {myActivity.my_tasks.map((t, i) => {
//                               const late = t.due_at && new Date(t.due_at) < new Date();
//                               return (
//                                 <tr key={t.id}
//                                   className={cx("cursor-pointer hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
//                                   onClick={() => router.push("/tasks")}>
//                                   <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{t.title}</td>
//                                   <td className="px-4 py-3.5 text-sm text-slate-500">{t.due_at ? new Date(t.due_at).toLocaleDateString("fr-FR") : "—"}</td>
//                                   <td className="px-6 py-3.5 text-right">
//                                     <span className={cx("text-xs rounded-md px-2.5 py-1 font-medium border",
//                                       late ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"
//                                     )}>
//                                       {late ? "En retard" : "En cours"}
//                                     </span>
//                                   </td>
//                                 </tr>
//                               );
//                             })}
//                           </tbody>
//                         </table>
//                       </div>
//                     )}

//                     {myActivity.my_contacts.length > 0 && (
//                       <div>
//                         <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100">
//                           <span className="text-xs font-semibold text-slate-700">Contacts récents</span>
//                           <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{myActivity.my_contacts.length}</span>
//                         </div>
//                         <table className="w-full border-collapse">
//                           <thead className="bg-slate-50">
//                             <tr>
//                               <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">Nom</th>
//                               <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Ajouté</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {myActivity.my_contacts.map((c, i) => (
//                               <tr key={c.id}
//                                 className={cx("cursor-pointer hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
//                                 onClick={() => router.push("/contacts")}>
//                                 <td className="px-6 py-3.5">
//                                   <div className="flex items-center gap-3">
//                                     <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
//                                       <span className="text-xs font-bold text-slate-600">{c.first_name[0]}{c.last_name[0]}</span>
//                                     </div>
//                                     <span className="text-sm font-medium text-slate-800">{c.first_name} {c.last_name}</span>
//                                   </div>
//                                 </td>
//                                 <td className="px-6 py-3.5 text-right text-xs text-slate-400">{timeAgo(c.created_at)}</td>
//                               </tr>
//                             ))}
//                           </tbody>
//                         </table>
//                       </div>
//                     )}

//                     {myActivity.my_deals.length === 0 && myActivity.my_leads.length === 0 &&
//                      myActivity.my_tasks.length === 0 && myActivity.my_contacts.length === 0 && (
//                       <div className="flex flex-col items-center justify-center p-10 text-center">
//                         <div className="text-4xl mb-3">📭</div>
//                         <div className="text-sm font-medium text-slate-500">Aucune activité pour le moment</div>
//                         <div className="text-xs text-slate-400 mt-1">Vos deals, leads et tâches assignés apparaîtront ici</div>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </>
//             )}
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// }

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type DealStatus = "prospect" | "qualification" | "proposition" | "negociation" | "gagne" | "perdu";
type Period = "today" | "7d" | "30d" | "month" | "year" | "custom";

type ActivityItem = {
  id: string; type: "deal" | "lead" | "contact" | "task" | "company";
  action: string; title: string; user: string; at: string;
};

type MyActivity = {
  my_deals: { id: string; title: string; status: DealStatus; amount: number; updated_at: string }[];
  my_leads: { id: string; title: string; status: string; value_eur: number | null; created_at: string }[];
  my_tasks: { id: string; title: string; due_at: string | null; done: boolean }[];
  my_contacts: { id: string; first_name: string; last_name: string; created_at: string }[];
};

type DashboardData = {
  period: { startDate: string; endDate: string };
  kpi: {
    ca_gagne: number; ca_gagne_evol: number | null;
    pipeline_total: number;
    total_leads: number; total_leads_evol: number | null;
    taux_conversion: number;
    tasks_todo: number; tasks_overdue: number;
    total_deals: number; total_deals_evol: number | null;
  };
  deals_by_status: Record<DealStatus, number>;
  deals_by_status_global: Record<DealStatus, number>;
  leads_by_status: { nouveau: number; en_cours: number; converti: number; perdu: number };
  recent_deals: { id: string; title: string; status: DealStatus; amount: number; first_name: string | null; last_name: string | null }[];
  recent_leads: { id: string; title: string; status: string; value_eur: number | null; first_name: string | null; last_name: string | null }[];
  today_tasks: { id: string; title: string; due_at: string | null; done: boolean; priority?: string }[];
  monthly_sales: { month: string; count: number; total: number }[];
  commerciaux: { id: string; first_name: string; last_name: string; total_deals: number; deals_gagnes: number; ca: number; tasks_open: number }[];
};

// ── Email stats type ──
type EmailStats = {
  total_sent: number;
  total_failed: number;
  sent_last_30d: number;
  unique_recipients: number;
  by_type: { type: string; count: number }[];
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Aujourd'hui" }, { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" }, { key: "month", label: "Ce mois" },
  { key: "year", label: "Cette année" }, { key: "custom", label: "Personnalisé" },
];

const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  prospect: "Prospect", qualification: "Qualification", proposition: "Proposition",
  negociation: "Négociation", gagne: "Gagné", perdu: "Perdu",
};
const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
  prospect: "#94a3b8", qualification: "#fbbf24", proposition: "#60a5fa",
  negociation: "#a78bfa", gagne: "#10b981", perdu: "#f87171",
};

const EMAIL_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  welcome:        { label: "Bienvenue",      icon: "🎉" },
  deal_won:       { label: "Deal gagné",      icon: "🏆" },
  new_lead:       { label: "Nouveau lead",    icon: "🎯" },
  lead_converted: { label: "Lead converti",   icon: "✅" },
  overdue_task:   { label: "Tâche retard",   icon: "⚠️" },
  task_assigned:  { label: "Tâche assignée", icon: "📋" },
  password_reset: { label: "Reset mdp",       icon: "🔑" },
  role_changed:   { label: "Rôle modifié",   icon: "👑" },
  account_status: { label: "Statut compte",  icon: "🔒" },
  other:          { label: "Email manuel",   icon: "📧" },
};

function cx(...xs: Array<string | false | undefined | null>) { return xs.filter(Boolean).join(" "); }
function fmt(n: number) { return new Intl.NumberFormat("fr-FR").format(Math.round(n)); }
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}
function getUserName(): string {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.name || payload.email || "";
  } catch { return ""; }
}

const TYPE_LABELS: Record<string, string> = {
  deal: "Transaction", lead: "Lead", contact: "Contact", task: "Tâche", company: "Entreprise",
};
const TYPE_ROUTES: Record<string, string> = {
  deal: "/deals", lead: "/leads", contact: "/contacts", task: "/tasks", company: "/entreprises",
};

function ActivityCard({ item, userName }: { item: ActivityItem; userName: string }) {
  const router = useRouter();
  const typeLabel = TYPE_LABELS[item.type] ?? item.type;
  const badge = item.type === "lead" ? "Lead" : item.type === "contact" ? "Opportunité" : null;
  const route = TYPE_ROUTES[item.type];
  return (
    <div onClick={() => route && router.push(route)}
      className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all flex flex-col gap-3 flex-shrink-0"
      style={{ width: "210px", minHeight: "140px" }}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">{typeLabel}</span>
        {badge && <span className="text-xs bg-blue-600 text-white rounded-full px-2.5 py-0.5 font-medium">{badge}</span>}
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold text-slate-900 underline leading-snug line-clamp-3">{item.title}</div>
        <div className="text-xs text-slate-400 mt-1.5">
          {item.action} (par {item.user === userName ? "vous" : item.user}) {timeAgo(item.at)}
        </div>
      </div>
    </div>
  );
}

type KpiAccent = "emerald" | "blue" | "amber" | "rose" | "slate";
const ACCENT_MAP: Record<KpiAccent, { dot: string; value: string }> = {
  emerald: { dot: "bg-emerald-500", value: "text-slate-900" },
  blue:    { dot: "bg-blue-500",    value: "text-slate-900" },
  amber:   { dot: "bg-amber-500",   value: "text-slate-900" },
  rose:    { dot: "bg-rose-500",    value: "text-rose-600"  },
  slate:   { dot: "bg-slate-300",   value: "text-slate-900" },
};
function KpiCard({ icon, label, value, sub, evol, accent }: { icon: string; label: string; value: string; sub: string; evol: number | null; accent: KpiAccent }) {
  const a = ACCENT_MAP[accent];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${a.dot}`} />
          <span className="text-xs font-medium text-slate-500">{label}</span>
        </div>
        <span className="text-base">{icon}</span>
      </div>
      <div className={`text-2xl font-bold mb-1 ${a.value}`}>{value}</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{sub}</span>
        {evol !== null && evol !== undefined && (
          <span className={`text-xs font-semibold rounded-md px-1.5 py-0.5 ${evol >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {evol >= 0 ? "↑" : "↓"} {Math.abs(evol)}%
          </span>
        )}
      </div>
    </div>
  );
}

function CaChart({ sales }: { sales: { month: string; count: number; total: number }[] }) {
  const W = 560, H = 160, PAD_L = 48, PAD_R = 16, PAD_T = 16, PAD_B = 32;
  const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
  const maxVal = Math.max(1, ...sales.map(m => Number(m.total)));
  const points = sales.map((m, i) => ({
    x: PAD_L + (i / Math.max(sales.length - 1, 1)) * chartW,
    y: PAD_T + chartH - ((Number(m.total) / maxVal) * chartH), m,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${PAD_T + chartH} L ${points[0].x.toFixed(1)} ${PAD_T + chartH} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map(pct => {
        const y = PAD_T + ((100 - pct) / 100) * chartH;
        const val = maxVal * pct / 100;
        return (
          <g key={pct}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke={pct === 0 ? "#e2e8f0" : "#f1f5f9"} strokeWidth="1" />
            <text x={PAD_L - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="#cbd5e1">{val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#grad)" />
      <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i} className="group" style={{ cursor: "pointer" }}>
          <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
          <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#10b981" strokeWidth="2" className="opacity-0 group-hover:opacity-100 transition-opacity" />
          <g className="opacity-0 group-hover:opacity-100 transition-opacity">
            <rect x={p.x - 40} y={p.y - 36} width="80" height="24" rx="5" fill="#1e293b" />
            <text x={p.x} y={p.y - 21} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">{new Intl.NumberFormat("fr-FR").format(Math.round(Number(p.m.total)))} €</text>
            <text x={p.x} y={p.y - 11} textAnchor="middle" fontSize="8" fill="#94a3b8">{p.m.count} deal{Number(p.m.count) > 1 ? "s" : ""}</text>
          </g>
          <text x={p.x} y={H - 2} textAnchor="middle" fontSize="8" fill="#94a3b8">
            {(() => { const [y, mo] = p.m.month.split("-"); return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("fr-FR", { month: "short" }); })()}
          </text>
        </g>
      ))}
    </svg>
  );
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 h-28">
            <div className="h-3 w-24 rounded bg-slate-200 mb-4" /><div className="h-7 w-20 rounded bg-slate-200 mb-2" /><div className="h-2 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bloc Email Stats ──
function EmailStatsBlock({ stats, onViewAll }: { stats: EmailStats; onViewAll: () => void }) {
  const successRate = stats.total_sent > 0
    ? Math.round(((stats.total_sent - stats.total_failed) / stats.total_sent) * 100)
    : 0;
  const topTypes = (stats.by_type || []).slice(0, 4);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">📧 Performance emailing</h2>
          <p className="text-xs text-slate-400 mt-0.5">Statistiques des communications Brevo</p>
        </div>
        <button onClick={onViewAll} className="text-xs text-emerald-600 hover:underline font-medium">
          Voir l'historique →
        </button>
      </div>
      <div className="p-6">
        {/* KPIs emails */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total envoyés",        value: stats.total_sent,          icon: "📤", color: "text-slate-900" },
            { label: "30 derniers jours",     value: stats.sent_last_30d,       icon: "📅", color: "text-blue-600"  },
            { label: "Destinataires uniques", value: stats.unique_recipients,   icon: "👤", color: "text-emerald-600" },
            { label: "Taux de succès",        value: `${successRate}%`,         icon: "✅", color: successRate >= 90 ? "text-emerald-600" : "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-slate-50 p-4 text-center">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Répartition par type */}
        {topTypes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Répartition par type</p>
            <div className="space-y-2">
              {topTypes.map(t => {
                const meta = EMAIL_TYPE_LABELS[t.type] || { label: t.type, icon: "📧" };
                const pct = stats.total_sent > 0 ? Math.round((t.count / stats.total_sent) * 100) : 0;
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-sm w-5 text-center">{meta.icon}</span>
                    <span className="text-xs text-slate-600 w-32 truncate">{meta.label}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-6 text-right">{t.count}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Note taux d'ouverture Brevo */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-3 bg-blue-50 rounded-xl p-3">
          <span className="text-lg">📊</span>
          <div>
            <p className="text-xs font-semibold text-blue-800">Taux d'ouverture & clics</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Les statistiques avancées (ouvertures, clics, désinscriptions) sont disponibles en temps réel dans votre{" "}
              <a href="https://app.brevo.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                dashboard Brevo →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data,       setData]       = useState<DashboardData | null>(null);
  const [activity,   setActivity]   = useState<ActivityItem[]>([]);
const [myActivity, setMyActivity] = useState<MyActivity>({
  my_deals: [],
  my_leads: [],
  my_tasks: [],
  my_contacts: [],
});
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [period,     setPeriod]     = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [userName,    setUserName]    = useState("");

  useEffect(() => { setUserName(getUserName()); }, []);

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  const loadDashboard = useCallback(async (p: Period = period, cs = customStart, ce = customEnd) => {
    setError(null); setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      let url = `${API}/dashboard/stats?period=${p}`;
      if (p === "custom" && cs && ce) url = `${API}/dashboard/stats?start=${cs}&end=${ce}`;
      const [res, actRes, myRes, emailRes] = await Promise.all([
        fetch(url,                          { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/dashboard/activity`,  { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/dashboard/my-activity`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/emails/stats`,        { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const json      = await res.json().catch(() => null);
      const actJson   = await actRes.json().catch(() => []);
      const myJson    = await myRes.json().catch(() => null);
      const emailJson = await emailRes.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
      setData(json);
      setActivity(Array.isArray(actJson) ? actJson : []);
      setMyActivity(myJson);
      if (emailJson && !emailJson.error) setEmailStats(emailJson);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [period, customStart, customEnd]);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return; }
    loadDashboard();
  }, []);

  function handlePeriod(p: Period) {
    setPeriod(p);
    if (p !== "custom") loadDashboard(p);
  }

  const totalDealsStatus = useMemo(() =>
    data ? Object.values(data.deals_by_status).reduce((a, b) => a + b, 0) : 0, [data]);

  const OBJECTIF = 80000;
  const objectifPct = data ? Math.min(100, Math.round((data.kpi.ca_gagne / OBJECTIF) * 100)) : 0;

  const funnelSteps = useMemo(() => {
    if (!data) return [];
    const { nouveau, en_cours, converti, perdu } = data.leads_by_status;
    const total = nouveau + en_cours + converti + perdu;
    return [
      { key: "total",    label: "Leads entrés", count: total,    color: "#6366f1", pct: 100 },
      { key: "en_cours", label: "En cours",      count: en_cours, color: "#f59e0b", pct: total > 0 ? Math.round((en_cours / total) * 100) : 0 },
      { key: "converti", label: "Convertis",     count: converti, color: "#10b981", pct: total > 0 ? Math.round((converti / total) * 100) : 0 },
      { key: "perdu",    label: "Perdus",        count: perdu,    color: "#f87171", pct: total > 0 ? Math.round((perdu / total) * 100) : 0 },
    ];
  }, [data]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">


        <main className="flex-1 min-w-0 overflow-hidden">
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
            <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{greeting}{userName ? `, ${userName}` : ""} </h1>
                <p className="text-sm text-slate-400 mt-0.5">Voici le résumé de votre activité commerciale.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1">
                  {PERIODS.map(p => (
                    <button key={p.key} onClick={() => handlePeriod(p.key)}
                      className={cx("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        period === p.key ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => loadDashboard()} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors">⟳</button>
              </div>
            </div>
            {period === "custom" && (
              <div className="px-6 pb-3 flex items-center gap-2">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-400" />
                <span className="text-slate-400 text-xs">→</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-400" />
                <button onClick={() => loadDashboard("custom", customStart, customEnd)} disabled={!customStart || !customEnd} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40 hover:bg-emerald-700">Appliquer</button>
              </div>
            )}
          </div>

          <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto">
            {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">⚠️ {error}</div>}

            {loading ? <SkeletonDashboard /> : !data ? null : (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard icon="" label="CA encaissé"        value={`${fmt(data.kpi.ca_gagne)} €`}     sub="Formations vendues"       evol={data.kpi.ca_gagne_evol}     accent="emerald" />
                  <KpiCard icon="" label="Taux de conversion" value={`${data.kpi.taux_conversion}%`}    sub="Leads → Gagné"            evol={null}                         accent={data.kpi.taux_conversion >= 20 ? "emerald" : "amber"} />
                  <KpiCard icon="" label="Nouveaux prospects" value={String(data.kpi.total_leads)}       sub="Leads sur la période"     evol={data.kpi.total_leads_evol}   accent="blue" />
                  <KpiCard icon="" label="Tâches en retard"  value={String(data.kpi.tasks_overdue)}     sub="À traiter en priorité"    evol={null}                         accent={data.kpi.tasks_overdue > 0 ? "rose" : "slate"} />
                </div>

                {/* Objectif + Pipeline + Tâches */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Objectif du mois</span>
                      <span className="text-xs font-bold text-emerald-600">{objectifPct}% atteint</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-1">{fmt(data.kpi.ca_gagne)} €</div>
                    <div className="text-xs text-slate-400 mb-3">sur {fmt(OBJECTIF)} € d'objectif</div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${objectifPct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1.5"><span>0 €</span><span>{fmt(OBJECTIF)} €</span></div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pipeline commercial</div>
                    <div className="text-2xl font-bold text-slate-900 mb-1">{fmt(data.kpi.pipeline_total)} €</div>
                    <div className="text-xs text-slate-400 mb-3">CA prévisionnel en cours</div>
                    <div className="space-y-2">
                      {(["qualification", "proposition", "negociation"] as DealStatus[]).map(s => {
                        const count = data.deals_by_status[s] ?? 0;
                        const pct = totalDealsStatus > 0 ? Math.round((count / totalDealsStatus) * 100) : 0;
                        return (
                          <div key={s} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DEAL_STATUS_COLORS[s] }} />
                            <span className="text-xs text-slate-600 flex-1">{DEAL_STATUS_LABELS[s]}</span>
                            <span className="text-xs font-semibold text-slate-700">{count}</span>
                            <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tâches urgentes</span>
                      <button onClick={() => router.push("/tasks")} className="text-xs text-emerald-600 hover:underline">Voir toutes →</button>
                    </div>
                    {data.today_tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="text-2xl mb-1">🎉</div>
                        <div className="text-xs text-slate-400">Aucune tâche urgente</div>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {data.today_tasks.slice(0, 4).map(task => {
                          const isLate = task.due_at && new Date(task.due_at) < new Date();
                          const isUrgent = task.priority === "urgent";
                          return (
                            <div key={task.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                              <div className={cx("h-1.5 w-1.5 rounded-full flex-shrink-0", isUrgent ? "bg-orange-500" : isLate ? "bg-rose-500" : "bg-amber-400")} />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-slate-800 truncate">{task.title}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {isUrgent && <span className="text-[10px] bg-orange-100 text-orange-700 rounded px-1.5 py-0.5 font-medium">🔴 Urgent</span>}
                                  {task.due_at && <span className={cx("text-[10px]", isLate ? "text-rose-500" : "text-slate-400")}>{isLate ? "En retard · " : ""}{new Date(task.due_at).toLocaleDateString("fr-FR")}</span>}
                                  {!task.due_at && !isUrgent && <span className="text-[10px] text-slate-400">Pas d'échéance</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Graphique CA + Répartition deals */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">Évolution du CA mensuel</h2>
                        <p className="text-xs text-slate-400 mt-0.5">12 derniers mois</p>
                      </div>
                      {data.monthly_sales.length > 0 && (
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Total période</div>
                          <div className="text-sm font-bold text-emerald-600">{fmt(data.monthly_sales.reduce((a, m) => a + Number(m.total), 0))} €</div>
                        </div>
                      )}
                    </div>
                    {data.monthly_sales.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-44 text-slate-300">
                        <div className="text-4xl mb-2">📊</div>
                        <div className="text-sm">Aucune vente sur cette période</div>
                      </div>
                    ) : <CaChart sales={data.monthly_sales} />}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">Répartition des deals</h2>
                    <div className="space-y-3">
                      {(Object.keys(DEAL_STATUS_LABELS) as DealStatus[]).map(status => {
                        const globalData = data.deals_by_status_global ?? data.deals_by_status;
                        const totalGlobal = Object.values(globalData).reduce((a, b) => a + b, 0);
                        const count = globalData[status] ?? 0;
                        const pct = totalGlobal > 0 ? Math.round((count / totalGlobal) * 100) : 0;
                        return (
                          <div key={status}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: DEAL_STATUS_COLORS[status] }} />
                                <span className="text-xs text-slate-600">{DEAL_STATUS_LABELS[status]}</span>
                              </div>
                              <span className="text-xs font-semibold text-slate-700">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: DEAL_STATUS_COLORS[status] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs">
                      <span className="text-slate-400">Total deals</span>
                      <span className="font-semibold text-slate-700">{Object.values(data.deals_by_status_global ?? data.deals_by_status).reduce((a, b) => a + b, 0)}</span>
                    </div>
                  </div>
                </div>

                {/* ── BLOC EMAIL STATS ── */}
                {emailStats && (
                  <EmailStatsBlock stats={emailStats} onViewAll={() => router.push("/emails")} />
                )}

                {/* Entonnoir de conversion */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-sm font-semibold text-slate-900 mb-1">Entonnoir de conversion</h2>
                  <p className="text-xs text-slate-400 mb-5">Progression des leads — chaque barre = % par rapport au total entré</p>
                  <div className="space-y-4">
                    {funnelSteps.map(step => (
                      <div key={step.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-slate-700">{step.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{step.count}</span>
                            <span className="text-xs bg-slate-100 rounded-md px-1.5 py-0.5 text-slate-500 font-medium">{step.pct}%</span>
                          </div>
                        </div>
                        <div className="h-7 rounded-xl bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-xl flex items-center justify-end pr-3 transition-all duration-700"
                            style={{ width: `${Math.max(step.pct, 4)}%`, backgroundColor: step.color }}>
                            {step.pct > 12 && <span className="text-white text-xs font-bold">{step.count}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {funnelSteps.length > 0 && funnelSteps[0].count > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-500">Taux de conversion global</span>
                        <div className="text-xs text-slate-400">{funnelSteps[2].count} converti{funnelSteps[2].count > 1 ? "s" : ""} sur {funnelSteps[0].count} leads</div>
                      </div>
                      <span className="text-lg font-bold text-emerald-600">{Math.round((funnelSteps[2].count / funnelSteps[0].count) * 100)}%</span>
                    </div>
                  )}
                </div>

                {/* Activité récente */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
                    </svg>
                    <h2 className="text-sm font-semibold text-slate-900">Activité récente</h2>
                  </div>
                  {activity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <div className="text-4xl mb-3">📭</div>
                      <div className="text-sm text-slate-400">Aucune activité récente</div>
                    </div>
                  ) : (
                    <div className="p-5 flex gap-4 overflow-x-auto">
                      {activity.map((item, i) => <ActivityCard key={item.id + i} item={item} userName={userName} />)}
                    </div>
                  )}
                </div>

                {/* Mon activité */}
                {myActivity && (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                      <h2 className="text-sm font-semibold text-slate-900">Mon activité</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Vos deals, leads et tâches assignés</p>
                    </div>

                    {myActivity.my_deals.length > 0 && (
                      <div className="border-b border-slate-200">
                        <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100">
                          <span className="text-xs font-semibold text-slate-700">Deals</span>
                          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{myActivity.my_deals.length}</span>
                        </div>
                        <table className="w-full border-collapse">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200 w-2/5">Titre</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">Statut</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Montant</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Modifié</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myActivity.my_deals.map((d, i) => (
                              <tr key={d.id} className={cx("cursor-pointer hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/40")} onClick={() => router.push("/deals")}>
                                <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{d.title}</td>
                                <td className="px-4 py-3.5">
                                  <span className={cx("text-xs rounded-md px-2.5 py-1 font-medium border",
                                    d.status === "gagne" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    d.status === "perdu" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                    d.status === "negociation" ? "bg-purple-50 text-purple-700 border-purple-200" :
                                    d.status === "proposition" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    d.status === "qualification" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    "bg-slate-50 text-slate-600 border-slate-200"
                                  )}>{DEAL_STATUS_LABELS[d.status]}</span>
                                </td>
                                <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-800">{fmt(d.amount)} €</td>
                                <td className="px-6 py-3.5 text-right text-xs text-slate-400">{timeAgo(d.updated_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {myActivity.my_leads.length > 0 && (
                      <div className="border-b border-slate-200">
                        <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100">
                          <span className="text-xs font-semibold text-slate-700">Leads</span>
                          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{myActivity.my_leads.length}</span>
                        </div>
                        <table className="w-full border-collapse">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200 w-2/5">Titre</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">Statut</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Valeur</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Créé</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myActivity.my_leads.map((l, i) => (
                              <tr key={l.id} className={cx("cursor-pointer hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/40")} onClick={() => router.push("/leads")}>
                                <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{l.title}</td>
                                <td className="px-4 py-3.5">
                                  <span className={cx("text-xs rounded-md px-2.5 py-1 font-medium border",
                                    l.status === "converti" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    l.status === "perdu" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                    l.status === "en_cours" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    "bg-blue-50 text-blue-700 border-blue-200"
                                  )}>{l.status.replace("_", " ")}</span>
                                </td>
                                <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-800">{l.value_eur != null ? `${fmt(l.value_eur)} €` : "—"}</td>
                                <td className="px-6 py-3.5 text-right text-xs text-slate-400">{timeAgo(l.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {myActivity.my_tasks.length > 0 && (
                      <div>
                        <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100">
                          <span className="text-xs font-semibold text-slate-700">Tâches en cours</span>
                          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{myActivity.my_tasks.length}</span>
                        </div>
                        <table className="w-full border-collapse">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200 w-2/5">Tâche</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">Échéance</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 border-b border-slate-200">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myActivity.my_tasks.map((t, i) => {
                              const late = t.due_at && new Date(t.due_at) < new Date();
                              return (
                                <tr key={t.id} className={cx("cursor-pointer hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/40")} onClick={() => router.push("/tasks")}>
                                  <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{t.title}</td>
                                  <td className="px-4 py-3.5 text-sm text-slate-500">{t.due_at ? new Date(t.due_at).toLocaleDateString("fr-FR") : "—"}</td>
                                  <td className="px-6 py-3.5 text-right">
                                    <span className={cx("text-xs rounded-md px-2.5 py-1 font-medium border",
                                      late ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                    )}>{late ? "En retard" : "En cours"}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {myActivity.my_deals.length === 0 && myActivity.my_leads.length === 0 &&
                     myActivity.my_tasks.length === 0 && myActivity.my_contacts.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-10 text-center">
                        <div className="text-4xl mb-3">📭</div>
                        <div className="text-sm font-medium text-slate-500">Aucune activité pour le moment</div>
                        <div className="text-xs text-slate-400 mt-1">Vos deals, leads et tâches assignés apparaîtront ici</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}