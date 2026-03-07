"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type EmailLog = {
  id: string;
  to_email: string;
  subject: string;
  type: string;
  status: "sent" | "failed";
  sent_at: string;
  user_first_name: string | null;
  user_last_name: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
};

type EmailStats = {
  total_sent: number;
  total_failed: number;
  sent_last_30d: number;
  unique_recipients: number;
  by_type: { type: string; count: number }[];
};

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  welcome:        { label: "Bienvenue",       icon: "🎉", color: "bg-emerald-100 text-emerald-700" },
  deal_won:       { label: "Deal gagné",       icon: "🏆", color: "bg-amber-100 text-amber-700" },
  new_lead:       { label: "Nouveau lead",     icon: "🎯", color: "bg-blue-100 text-blue-700" },
  lead_converted: { label: "Lead converti",    icon: "✅", color: "bg-emerald-100 text-emerald-700" },
  overdue_task:   { label: "Tâche en retard",  icon: "⚠️", color: "bg-rose-100 text-rose-700" },
  task_assigned:  { label: "Tâche assignée",   icon: "📋", color: "bg-purple-100 text-purple-700" },
  password_reset: { label: "Reset password",   icon: "🔑", color: "bg-slate-100 text-slate-700" },
  role_changed:   { label: "Rôle modifié",     icon: "👑", color: "bg-violet-100 text-violet-700" },
  account_status: { label: "Statut compte",    icon: "🔒", color: "bg-slate-100 text-slate-700" },
  other:          { label: "Autre",            icon: "📧", color: "bg-slate-100 text-slate-600" },
};

function cx(...xs: Array<string | false | undefined | null>) { return xs.filter(Boolean).join(" "); }

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function EmailsHistoryPage() {
  const router = useRouter();
  const [logs, setLogs]       = useState<EmailLog[]>([]);
  const [stats, setStats]     = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<string>("all");

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  const load = useCallback(async () => {
    setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API}/emails/history?limit=100`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/emails/stats`,             { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const logsJson  = await logsRes.json();
      const statsJson = await statsRes.json();
      setLogs(Array.isArray(logsJson) ? logsJson : []);
      setStats(statsJson);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? logs : logs.filter(l => l.type === filter);

  const NAV = [
    { label: "Dashboard",   path: "/dashboard",   icon: "📊" },
    { label: "Contacts",    path: "/contacts",    icon: "👤" },
    { label: "Entreprises", path: "/entreprises", icon: "🏢" },
    { label: "Leads",       path: "/leads",       icon: "🎯" },
    { label: "Deals",       path: "/deals",       icon: "💼" },
    { label: "Pipeline",    path: "/pipeline",    icon: "📈" },
    { label: "Tâches",      path: "/tasks",       icon: "✅" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">

       

        {/* Main */}
        <main className="flex-1 min-w-0">

          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Historique des communications</h1>
                <p className="text-sm text-slate-400 mt-0.5">Tous les emails envoyés par le CRM</p>
              </div>
              <button onClick={load} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                ⟳ Actualiser
              </button>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6 max-w-6xl mx-auto">

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total envoyés",      value: stats.total_sent,        icon: "📧", color: "text-slate-900" },
                  { label: "30 derniers jours",  value: stats.sent_last_30d,     icon: "📅", color: "text-blue-600" },
                  { label: "Destinataires uniques", value: stats.unique_recipients, icon: "👤", color: "text-emerald-600" },
                  { label: "Échecs",             value: stats.total_failed,      icon: "❌", color: stats.total_failed > 0 ? "text-rose-600" : "text-slate-400" },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-500">{s.label}</span>
                      <span className="text-lg">{s.icon}</span>
                    </div>
                    <div className={cx("text-2xl font-bold", s.color)}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Répartition par type */}
            {stats && stats.by_type?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Répartition par type d'email</h2>
                <div className="flex flex-wrap gap-2">
                  {stats.by_type.map(t => {
                    const meta = TYPE_LABELS[t.type] || TYPE_LABELS["other"];
                    return (
                      <div key={t.type} className={cx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium", meta.color)}>
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                        <span className="font-bold ml-1">×{t.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filtres */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500 font-medium">Filtrer :</span>
              <button onClick={() => setFilter("all")}
                className={cx("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === "all" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                Tous ({logs.length})
              </button>
              {Object.entries(TYPE_LABELS).map(([key, meta]) => {
                const count = logs.filter(l => l.type === key).length;
                if (count === 0) return null;
                return (
                  <button key={key} onClick={() => setFilter(key)}
                    className={cx("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      filter === key ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                    {meta.icon} {meta.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Chargement...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <div className="text-sm text-slate-400">Aucun email envoyé pour l'instant</div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Destinataire</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Sujet</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(log => {
                      const meta = TYPE_LABELS[log.type] || TYPE_LABELS["other"];
                      return (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <span className={cx("inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium", meta.color)}>
                              {meta.icon} {meta.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-medium text-slate-800">{log.to_email}</div>
                            {(log.contact_first_name || log.user_first_name) && (
                              <div className="text-xs text-slate-400">
                                {log.contact_first_name
                                  ? `${log.contact_first_name} ${log.contact_last_name}`
                                  : `${log.user_first_name} ${log.user_last_name}`}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            <div className="text-slate-600 truncate max-w-xs">{log.subject}</div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={cx(
                              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium",
                              log.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {log.status === "sent" ? "✅ Envoyé" : "❌ Échoué"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {timeAgo(log.sent_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}