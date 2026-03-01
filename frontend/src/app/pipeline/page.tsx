"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

/* ─────────────────────────── Types ─────────────────────────── */
type DealStatus = "prospect" | "qualification" | "proposition" | "negociation" | "gagne" | "perdu";

type StageData = {
  status: DealStatus;
  count: number;
  total: number;
};

type Stats = {
  summary: {
    total_deals: number;
    total_value: number;
    weighted_value: number;
    won_value: number;
    active_deals: number;
  };
  by_status: StageData[];
};

/* ─────────────────────────── Constants ─────────────────────────── */
const PIPELINE_STAGES: DealStatus[] = [
  "prospect", "qualification", "proposition", "negociation", "gagne",
];

const STAGE_LABELS: Record<DealStatus, string> = {
  prospect: "Prospect",
  qualification: "Qualification",
  proposition: "Proposition",
  negociation: "Négociation",
  gagne: "Gagné",
  perdu: "Perdu",
};

const STAGE_COLORS: Record<DealStatus, { bg: string; text: string; border: string; funnel: string }> = {
  prospect:      { bg: "bg-slate-100",   text: "text-slate-700",   border: "border-slate-300",   funnel: "#94a3b8" },
  qualification: { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-300",   funnel: "#fbbf24" },
  proposition:   { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-300",    funnel: "#60a5fa" },
  negociation:   { bg: "bg-purple-100",  text: "text-purple-700",  border: "border-purple-300",  funnel: "#a78bfa" },
  gagne:         { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", funnel: "#34d399" },
  perdu:         { bg: "bg-rose-100",    text: "text-rose-700",    border: "border-rose-300",    funnel: "#f87171" },
};

const STAGE_ICONS: Record<DealStatus, string> = {
  prospect: "🎯",
  qualification: "🔍",
  proposition: "📄",
  negociation: "🤝",
  gagne: "🏆",
  perdu: "❌",
};

/* ─────────────────────────── Helpers ─────────────────────────── */
function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function conversionRate(from: number, to: number) {
  if (from === 0) return 0;
  return Math.round((to / from) * 100);
}

/* ═══════════════════════════ Page ═══════════════════════════ */
export default function PipelinePage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  async function loadStats() {
    setError(null); setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/deals/stats`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  /* ── Build stage map ── */
  const stageMap = useMemo(() => {
    const m: Record<string, StageData> = {};
    stats?.by_status.forEach(s => { m[s.status] = s; });
    return m;
  }, [stats]);

  /* ── Max count for funnel width scaling ── */
  const maxCount = useMemo(() => {
    return Math.max(1, ...PIPELINE_STAGES.map(s => stageMap[s]?.count ?? 0));
  }, [stageMap]);

  const totalProspects = stageMap["prospect"]?.count ?? 0;
  const totalGagne = stageMap["gagne"]?.count ?? 0;
  const globalConversion = conversionRate(totalProspects, totalGagne);

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
              <SidebarItem label="Dashboard"   onClick={() => router.push("/dashboard")} />
              <SidebarItem label="Contacts"    onClick={() => router.push("/contacts")} />
              <SidebarItem label="Entreprises" onClick={() => router.push("/entreprises")} />
              <SidebarItem label="Leads"       onClick={() => router.push("/leads")} />
              <SidebarItem label="Deals"       onClick={() => router.push("/deals")} />
              <SidebarItem active label="Pipeline" onClick={() => router.push("/pipeline")} />
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
            <div className="mx-auto max-w-6xl px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold">Pipeline & Funnel</h1>
                  <p className="text-sm text-slate-500">Visualisation du cycle de vente et taux de conversion</p>
                </div>
                <button
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={loadStats}
                  title="Rafraîchir"
                >⟳</button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">

            {/* Error */}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {error}
              </div>
            )}

            {loading ? (
              <SkeletonPipeline />
            ) : !stats ? null : (
              <>
                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    label="Total pipeline"
                    value={`${fmt(stats.summary.total_value)} €`}
                    sub={`${stats.summary.total_deals} deals`}
                    icon="💼"
                  />
                  <KpiCard
                    label="Valeur pondérée"
                    value={`${fmt(stats.summary.weighted_value)} €`}
                    sub="Selon probabilités"
                    icon="%"
                  />
                  <KpiCard
                    label="CA gagné"
                    value={`${fmt(stats.summary.won_value)} €`}
                    sub={`${stageMap["gagne"]?.count ?? 0} deals gagnés`}
                    icon="🏆"
                  />
                  <KpiCard
                    label="Taux de conversion"
                    value={`${globalConversion}%`}
                    sub="Prospect → Gagné"
                    icon="📈"
                    highlight={globalConversion > 20}
                  />
                </div>

                {/* ── Funnel ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-base font-semibold mb-6">Funnel de conversion</h2>

                  <div className="flex flex-col items-center gap-0">
                    {PIPELINE_STAGES.map((status, idx) => {
                      const stage = stageMap[status];
                      const count = stage?.count ?? 0;
                      const total = stage?.total ?? 0;
                      const color = STAGE_COLORS[status];

                      // Width: de 100% pour prospect jusqu'à ~30% pour gagné
                      const widthPct = maxCount === 0 ? 30 : Math.max(20, Math.round((count / maxCount) * 100));

                      // Taux de conversion vers l'étape suivante
                      const nextStatus = PIPELINE_STAGES[idx + 1];
                      const nextCount = nextStatus ? (stageMap[nextStatus]?.count ?? 0) : null;
                      const rate = nextCount !== null ? conversionRate(count, nextCount) : null;

                      return (
                        <div key={status} className="w-full flex flex-col items-center">
                          {/* Barre du funnel */}
                          <div
                            className="flex items-center justify-between rounded-xl px-5 py-3 transition-all duration-500"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: color.funnel + "33",
                              borderLeft: `4px solid ${color.funnel}`,
                              minWidth: "280px",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{STAGE_ICONS[status]}</span>
                              <div>
                                <div className="font-semibold text-sm text-slate-800">{STAGE_LABELS[status]}</div>
                                <div className="text-xs text-slate-500">{fmt(total)} €</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className="text-2xl font-bold"
                                style={{ color: color.funnel }}
                              >{count}</div>
                              <div className="text-xs text-slate-500">deal{count > 1 ? "s" : ""}</div>
                            </div>
                          </div>

                          {/* Flèche + taux entre étapes */}
                          {rate !== null && (
                            <div className="flex flex-col items-center my-1">
                              <div className="text-xs text-slate-400 font-medium">{rate}%</div>
                              <div className="text-slate-300 text-lg leading-none">↓</div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Perdu en dehors du funnel */}
                    {stageMap["perdu"] && (
                      <div className="mt-4 w-full flex justify-center">
                        <div
                          className="flex items-center gap-3 rounded-xl px-5 py-3 border border-dashed border-rose-200 bg-rose-50"
                          style={{ minWidth: "280px" }}
                        >
                          <span className="text-xl">❌</span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-rose-700">Perdus</div>
                            <div className="text-xs text-rose-400">{fmt(stageMap["perdu"].total)} €</div>
                          </div>
                          <div className="text-2xl font-bold text-rose-400">{stageMap["perdu"].count}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Tableau détaillé par étape ── */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-semibold">Détail par étape</h2>
                  </div>

                  <div className="grid grid-cols-6 gap-2 bg-slate-50 px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">
                    <div className="col-span-2">Étape</div>
                    <div className="text-right">Deals</div>
                    <div className="text-right">Montant total</div>
                    <div className="text-right">Probabilité</div>
                    <div className="text-right">Conversion suiv.</div>
                  </div>

                  {PIPELINE_STAGES.map((status, idx) => {
                    const stage = stageMap[status];
                    const count = stage?.count ?? 0;
                    const total = stage?.total ?? 0;
                    const color = STAGE_COLORS[status];
                    const nextStatus = PIPELINE_STAGES[idx + 1];
                    const nextCount = nextStatus ? (stageMap[nextStatus]?.count ?? 0) : null;
                    const rate = nextCount !== null ? conversionRate(count, nextCount) : null;

                    const probabilities: Record<DealStatus, number> = {
                      prospect: 10, qualification: 30, proposition: 55,
                      negociation: 75, gagne: 100, perdu: 0,
                    };

                    return (
                      <div key={status} className="grid grid-cols-6 gap-2 px-6 py-3 border-b border-slate-100 last:border-0 items-center hover:bg-slate-50">
                        <div className="col-span-2 flex items-center gap-2">
                          <span>{STAGE_ICONS[status]}</span>
                          <span className={classNames("rounded-lg px-2 py-1 text-xs font-medium", color.bg, color.text)}>
                            {STAGE_LABELS[status]}
                          </span>
                        </div>
                        <div className="text-right font-semibold text-slate-800">{count}</div>
                        <div className="text-right text-slate-700">{fmt(total)} €</div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500">{probabilities[status]}%</span>
                        </div>
                        <div className="text-right">
                          {rate !== null ? (
                            <span className={classNames(
                              "text-xs font-medium rounded-lg px-2 py-1",
                              rate >= 50 ? "bg-emerald-100 text-emerald-700" :
                              rate >= 25 ? "bg-amber-100 text-amber-700" :
                              "bg-rose-100 text-rose-700"
                            )}>
                              {rate}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Répartition visuelle ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-base font-semibold mb-4">Répartition du pipeline</h2>
                  <div className="space-y-3">
                    {[...PIPELINE_STAGES, "perdu" as DealStatus].map(status => {
                      const stage = stageMap[status];
                      const count = stage?.count ?? 0;
                      const pct = stats.summary.total_deals > 0
                        ? Math.round((count / stats.summary.total_deals) * 100)
                        : 0;
                      const color = STAGE_COLORS[status];

                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div className="w-28 text-xs text-slate-600 text-right">{STAGE_LABELS[status]}</div>
                          <div className="flex-1 h-6 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: color.funnel,
                                minWidth: pct > 0 ? "2rem" : "0",
                              }}
                            >
                              {pct > 5 && <span className="text-xs text-white font-medium">{pct}%</span>}
                            </div>
                          </div>
                          <div className="w-16 text-xs text-slate-500 text-right">{count} deal{count > 1 ? "s" : ""}</div>
                        </div>
                      );
                    })}
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

function KpiCard({ label, value, sub, icon, highlight }: {
  label: string; value: string; sub: string; icon: string; highlight?: boolean;
}) {
  return (
    <div className={classNames(
      "rounded-2xl border p-4",
      highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className={classNames("text-xl font-bold", highlight ? "text-emerald-700" : "text-slate-900")}>
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function SkeletonPipeline() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200 mb-3" />
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200 mb-6" />
        <div className="flex flex-col items-center gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl bg-slate-100"
              style={{ width: `${100 - i * 12}%`, height: "56px", minWidth: "280px" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}