"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ─────────────────────────── Types ─────────────────────────── */
type DealStatus = "prospect" | "qualification" | "proposition" | "negociation" | "gagne" | "perdu";

type DashboardData = {
  kpi: {
    ca_gagne: number;
    pipeline_total: number;
    total_leads: number;
    taux_conversion: number;
    tasks_todo: number;
    tasks_overdue: number;
  };
  deals_by_status: Record<DealStatus, number>;
  leads_by_status: {
    nouveau: number;
    en_cours: number;
    converti: number;
    perdu: number;
  };
  recent_deals: {
    id: string;
    title: string;
    status: DealStatus;
    amount: number;
    first_name: string | null;
    last_name: string | null;
  }[];
  recent_leads: {
    id: string;
    title: string;
    status: string;
    value_eur: number | null;
    first_name: string | null;
    last_name: string | null;
  }[];
  today_tasks: {
    id: string;
    title: string;
    due_at: string | null;
    done: boolean;
  }[];
  monthly_sales: {
    month: string;
    count: number;
    total: number;
  }[];
};

/* ─────────────────────────── Constants ─────────────────────────── */
const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  prospect: "Prospect",
  qualification: "Qualification",
  proposition: "Proposition",
  negociation: "Négociation",
  gagne: "Gagné",
  perdu: "Perdu",
};

const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
  prospect: "#94a3b8",
  qualification: "#fbbf24",
  proposition: "#60a5fa",
  negociation: "#a78bfa",
  gagne: "#34d399",
  perdu: "#f87171",
};

const DEAL_STATUS_BG: Record<DealStatus, string> = {
  prospect: "bg-slate-100 text-slate-700",
  qualification: "bg-amber-100 text-amber-700",
  proposition: "bg-blue-100 text-blue-700",
  negociation: "bg-purple-100 text-purple-700",
  gagne: "bg-emerald-100 text-emerald-700",
  perdu: "bg-rose-100 text-rose-700",
};

/* ─────────────────────────── Helpers ─────────────────────────── */
function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function fmtMonth(m: string) {
  const [year, month] = m.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

/* ═══════════════════════════ Page ═══════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function loadDashboard() {
    setError(null); setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  /* ── Monthly chart max ── */
  const maxMonthly = useMemo(() => {
    if (!data?.monthly_sales.length) return 1;
    return Math.max(1, ...data.monthly_sales.map(m => Number(m.total)));
  }, [data]);

  const maxDealsStatus = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...Object.values(data.deals_by_status));
  }, [data]);

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
              <SidebarItem active label="Dashboard"   onClick={() => router.push("/dashboard")} />
              <SidebarItem label="Contacts"    onClick={() => router.push("/contacts")} />
              <SidebarItem label="Entreprises" onClick={() => router.push("/entreprises")} />
              <SidebarItem label="Leads"       onClick={() => router.push("/leads")} />
              <SidebarItem label="Deals"       onClick={() => router.push("/deals")} />
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

          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold">Dashboard</h1>
                  <p className="text-sm text-slate-500">Vue d'ensemble de votre activité commerciale</p>
                </div>
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={loadDashboard}
                  title="Rafraîchir"
                >⟳</button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
            )}

            {loading ? (
              <SkeletonDashboard />
            ) : !data ? null : (
              <>
                {/* ══ KPI Cards ══ */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <KpiCard
                    icon="💰"
                    label="CA Gagné"
                    value={`${fmt(data.kpi.ca_gagne)} €`}
                    sub="Deals gagnés"
                    color="emerald"
                  />
                  <KpiCard
                    icon="📈"
                    label="Pipeline"
                    value={`${fmt(data.kpi.pipeline_total)} €`}
                    sub="Potentiel futur"
                    color="blue"
                  />
                  <KpiCard
                    icon="🧾"
                    label="Leads"
                    value={String(data.kpi.total_leads)}
                    sub="Total leads"
                    color="amber"
                  />
                  <KpiCard
                    icon="🔄"
                    label="Conversion"
                    value={`${data.kpi.taux_conversion}%`}
                    sub="Leads → Gagné"
                    color={data.kpi.taux_conversion >= 20 ? "emerald" : "slate"}
                  />
                  <KpiCard
                    icon="✅"
                    label="Tâches"
                    value={String(data.kpi.tasks_todo)}
                    sub="À faire"
                    color="purple"
                  />
                  <KpiCard
                    icon="⚠️"
                    label="En retard"
                    value={String(data.kpi.tasks_overdue)}
                    sub="Tâches en retard"
                    color={data.kpi.tasks_overdue > 0 ? "rose" : "slate"}
                  />
                </div>

                {/* ══ Row 2 : Graphiques ══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Évolution mensuelle */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-base font-semibold mb-4">📊 Évolution mensuelle des ventes</h2>
                    {data.monthly_sales.length === 0 ? (
                      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                        Aucune vente gagnée pour l'instant
                      </div>
                    ) : (
                      <div className="flex items-end gap-2 h-40">
                        {data.monthly_sales.map(m => {
                          const pct = Math.max(4, Math.round((Number(m.total) / maxMonthly) * 100));
                          return (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                              <div className="relative w-full flex flex-col items-center">
                                {/* Tooltip */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {fmt(m.total)} € · {m.count} deal{m.count > 1 ? "s" : ""}
                                </div>
                                <div
                                  className="w-full rounded-t-lg bg-emerald-400 hover:bg-emerald-500 transition-colors"
                                  style={{ height: `${pct}%`, minHeight: "4px" }}
                                />
                              </div>
                              <div className="text-xs text-slate-500 truncate w-full text-center">
                                {fmtMonth(m.month)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Deals par statut */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-base font-semibold mb-4">🎯 Deals par statut</h2>
                    <div className="space-y-3">
                      {(Object.keys(DEAL_STATUS_LABELS) as DealStatus[]).map(status => {
                        const count = data.deals_by_status[status] ?? 0;
                        const pct = maxDealsStatus > 0 ? Math.round((count / maxDealsStatus) * 100) : 0;
                        return (
                          <div key={status} className="flex items-center gap-3">
                            <div className="w-24 text-xs text-right text-slate-600">{DEAL_STATUS_LABELS[status]}</div>
                            <div className="flex-1 h-5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: DEAL_STATUS_COLORS[status],
                                  minWidth: count > 0 ? "1.5rem" : "0",
                                }}
                              >
                                {pct > 10 && <span className="text-xs text-white font-medium">{count}</span>}
                              </div>
                            </div>
                            <div className="w-6 text-xs text-slate-500 text-right">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ══ Row 3 : Leads par statut + Tâches aujourd'hui ══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Leads par statut */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-base font-semibold mb-4">🧾 Leads par statut</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: "nouveau", label: "Nouveau", icon: "🆕", bg: "bg-blue-50", text: "text-blue-700" },
                        { key: "en_cours", label: "En cours", icon: "⏳", bg: "bg-amber-50", text: "text-amber-700" },
                        { key: "converti", label: "Converti", icon: "✅", bg: "bg-emerald-50", text: "text-emerald-700" },
                        { key: "perdu", label: "Perdu", icon: "❌", bg: "bg-rose-50", text: "text-rose-700" },
                      ].map(({ key, label, icon, bg, text }) => (
                        <div key={key} className={classNames("rounded-xl p-4", bg)}>
                          <div className="flex items-center gap-2 mb-1">
                            <span>{icon}</span>
                            <span className={classNames("text-xs font-medium", text)}>{label}</span>
                          </div>
                          <div className={classNames("text-2xl font-bold", text)}>
                            {data.leads_by_status[key as keyof typeof data.leads_by_status] ?? 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tâches du jour */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold">📌 Tâches urgentes</h2>
                      <button
                        onClick={() => router.push("/tasks")}
                        className="text-xs text-emerald-600 hover:underline"
                      >Voir toutes →</button>
                    </div>
                    {data.today_tasks.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                        🎉 Aucune tâche urgente !
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.today_tasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <div className="h-2 w-2 rounded-full bg-rose-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{task.title}</div>
                              {task.due_at && (
                                <div className="text-xs text-rose-500">
                                  {new Date(task.due_at).toLocaleDateString("fr-FR")}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ══ Row 4 : Activité récente ══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Derniers deals */}
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                      <h2 className="text-base font-semibold">💼 Derniers deals</h2>
                      <button
                        onClick={() => router.push("/deals")}
                        className="text-xs text-emerald-600 hover:underline"
                      >Voir tous →</button>
                    </div>
                    <div>
                      {data.recent_deals.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">Aucun deal</div>
                      ) : data.recent_deals.map(deal => (
                        <div key={deal.id} className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{deal.title}</div>
                            <div className="text-xs text-slate-500">
                              {deal.first_name ? `${deal.first_name} ${deal.last_name}` : "—"}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold">{fmt(deal.amount)} €</div>
                            <span className={classNames("text-xs rounded-lg px-2 py-0.5", DEAL_STATUS_BG[deal.status])}>
                              {DEAL_STATUS_LABELS[deal.status]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Derniers leads */}
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                      <h2 className="text-base font-semibold">🧾 Derniers leads</h2>
                      <button
                        onClick={() => router.push("/leads")}
                        className="text-xs text-emerald-600 hover:underline"
                      >Voir tous →</button>
                    </div>
                    <div>
                      {data.recent_leads.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">Aucun lead</div>
                      ) : data.recent_leads.map(lead => (
                        <div key={lead.id} className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{lead.title}</div>
                            <div className="text-xs text-slate-500">
                              {lead.first_name ? `${lead.first_name} ${lead.last_name}` : "—"}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold">
                              {lead.value_eur ? `${fmt(lead.value_eur)} €` : "—"}
                            </div>
                            <span className={classNames(
                              "text-xs rounded-lg px-2 py-0.5",
                              lead.status === "converti" ? "bg-emerald-100 text-emerald-700" :
                              lead.status === "en_cours" ? "bg-amber-100 text-amber-700" :
                              lead.status === "perdu" ? "bg-rose-100 text-rose-700" :
                              "bg-blue-100 text-blue-700"
                            )}>
                              {lead.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
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

type KpiColor = "emerald" | "blue" | "amber" | "purple" | "rose" | "slate";

const KPI_COLORS: Record<KpiColor, { bg: string; text: string; sub: string }> = {
  emerald: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", sub: "text-emerald-500" },
  blue:    { bg: "bg-blue-50 border-blue-200",       text: "text-blue-700",    sub: "text-blue-400" },
  amber:   { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   sub: "text-amber-400" },
  purple:  { bg: "bg-purple-50 border-purple-200",   text: "text-purple-700",  sub: "text-purple-400" },
  rose:    { bg: "bg-rose-50 border-rose-200",       text: "text-rose-700",    sub: "text-rose-400" },
  slate:   { bg: "bg-white border-slate-200",        text: "text-slate-800",   sub: "text-slate-400" },
};

function KpiCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub: string; color: KpiColor;
}) {
  const c = KPI_COLORS[color];
  return (
    <div className={classNames("rounded-2xl border p-4", c.bg)}>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className={classNames("text-xl font-bold", c.text)}>{value}</div>
      <div className={classNames("text-xs mt-0.5", c.sub)}>{sub}</div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200 mb-3" />
            <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 h-52">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200 mb-4" />
            <div className="h-32 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}


