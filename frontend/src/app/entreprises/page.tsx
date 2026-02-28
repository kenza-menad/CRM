"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Company = {
  id: string; // ✅ UUID
  name: string;
  website: string | null;
  city: string | null;
  sector: string | null;
  created_at?: string;
};

type ViewMode = "grid" | "list";

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export default function EntreprisesPage() {
  const router = useRouter();

  // Auth token
  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  // Data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI controls
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "client" | "prospect" | "partner">("all");
  const [size, setSize] = useState<"all" | "1-10" | "11-50" | "51-200" | "200+">("all");
  const [view, setView] = useState<ViewMode>("grid");

  // Modal create/edit
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // ✅ UUID

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("");

  function requireTokenOrRedirect() {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return null;
    }
    return t;
  }

  function openCreate() {
    setEditingId(null);
    setError(null);
    setName("");
    setWebsite("");
    setCity("");
    setSector("");
    setOpen(true);
  }

  function openEdit(c: Company) {
    setEditingId(c.id);
    setError(null);
    setName(c.name ?? "");
    setWebsite(c.website ?? "");
    setCity(c.city ?? "");
    setSector(c.sector ?? "");
    setOpen(true);
  }

  async function loadCompanies() {
    setError(null);
    setLoading(true);

    const t = requireTokenOrRedirect();
    if (!t) return;

    try {
      const res = await fetch(`${API}/companies`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur chargement (${res.status})`);

      setCompanies(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Stats (pour l’instant basique)
  const stats = useMemo(() => {
    const total = companies.length;
    const clients = 0;
    const prospects = total;
    const partners = 0;
    return { total, clients, prospects, partners };
  }, [companies]);

  const filtered = useMemo(() => {
    let out = companies;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((c) => {
        const hay = [c.name, c.city ?? "", c.sector ?? "", c.website ?? ""].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    if (status !== "all") {
      // out = out.filter(c => c.status === status);
    }
    if (size !== "all") {
      // out = out.filter(c => c.size === size);
    }

    return out;
  }, [companies, query, status, size]);

  // Create OR Update
  async function onSubmitCompany(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const t = requireTokenOrRedirect();
    if (!t) return;

    if (!name.trim()) {
      setError("Le nom de l’entreprise est obligatoire.");
      return;
    }

    setSaving(true);
    try {
      const isEdit = typeof editingId === "string" && editingId.length > 0;
      const url = `${API}/companies${isEdit ? `/${editingId}` : ""}`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim() || null,
          city: city.trim() || null,
          sector: sector.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error || (isEdit ? `Erreur modification (${res.status})` : `Erreur création (${res.status})`)
        );
      }

      if (isEdit) {
        setCompanies((prev) => prev.map((c) => (c.id === editingId ? data : c)));
      } else {
        setCompanies((prev) => [data, ...prev]);
      }

      setOpen(false);
      setEditingId(null);
      setName("");
      setWebsite("");
      setCity("");
      setSector("");
    } catch (e: any) {
      setError(e?.message || (editingId ? "Erreur modification" : "Erreur création"));
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteCompany(id: string) {
    setError(null);

    const t = requireTokenOrRedirect();
    if (!t) return;

    const ok = confirm("Supprimer cette entreprise ?");
    if (!ok) return;

    try {
      const res = await fetch(`${API}/companies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Erreur suppression (${res.status})`);

      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      setError(e?.message || "Erreur suppression");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Sidebar */}
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
              <SidebarItem label="Dashboard" onClick={() => router.push("/dashboard")} />
              <SidebarItem label="Contacts" onClick={() => router.push("/contacts")} />
              <SidebarItem active label="Entreprises" onClick={() => router.push("/entreprises")} />
              <SidebarItem label="Leads" onClick={() => router.push("/leads")} />
              <SidebarItem label="Pipeline" onClick={() => router.push("/pipeline")} />
              <SidebarItem label="Tâches" onClick={() => router.push("/tasks")} />
              <div className="mt-4 border-t border-slate-300 pt-4">
                <SidebarItem label="Paramètres" onClick={() => router.push("/settings")} />
              </div>
            </nav>
          </div>

          <div className="p-4">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="text-sm font-semibold">Besoin d’aide ?</div>
              <div className="mt-1 text-xs text-slate-600">Consultez notre guide d’utilisation</div>
              <button className="mt-3 w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Voir le guide
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold">Entreprises</h1>
                  <p className="text-sm text-slate-500">Gérez vos entreprises et partenaires</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    title="Rafraîchir"
                    onClick={loadCompanies}
                  >
                    ⟳
                  </button>
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                    onClick={openCreate}
                  >
                    + Nouvelle entreprise
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <StatPill label="Total" value={stats.total} dotClass="bg-slate-900" />
                <StatPill label="Clients" value={stats.clients} dotClass="bg-emerald-600" />
                <StatPill label="Prospects" value={stats.prospects} dotClass="bg-amber-500" />
                <StatPill label="Partenaires" value={stats.partners} dotClass="bg-sky-500" />
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-col gap-3 md:flex-row">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-slate-300">
                      <span className="text-slate-400">🔎</span>
                      <input
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="Rechercher une entreprise..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none hover:bg-slate-50 focus:border-slate-300"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="client">Clients</option>
                      <option value="prospect">Prospects</option>
                      <option value="partner">Partenaires</option>
                    </select>

                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none hover:bg-slate-50 focus:border-slate-300"
                      value={size}
                      onChange={(e) => setSize(e.target.value as any)}
                    >
                      <option value="all">Toutes les tailles</option>
                      <option value="1-10">1–10</option>
                      <option value="11-50">11–50</option>
                      <option value="51-200">51–200</option>
                      <option value="200+">200+</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    className={classNames(
                      "rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50",
                      view === "list"
                        ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-900"
                        : "bg-white text-slate-800"
                    )}
                    onClick={() => setView("list")}
                    title="Vue liste"
                  >
                    ≡
                  </button>
                  <button
                    className={classNames(
                      "rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50",
                      view === "grid"
                        ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-900"
                        : "bg-white text-slate-800"
                    )}
                    onClick={() => setView("grid")}
                    title="Vue grille"
                  >
                    ☐
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-6">
            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <div className="font-semibold">Erreur</div>
                <div className="mt-1 text-rose-700">{error}</div>
                <div className="mt-3">
                  <button
                    className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                    onClick={loadCompanies}
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <SkeletonCompanies view={view} />
            ) : filtered.length === 0 ? (
              <EmptyState onCreate={openCreate} />
            ) : view === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => (
                  <CompanyCard
                    key={c.id}
                    c={c}
                    onEdit={() => openEdit(c)}
                    onDelete={() => onDeleteCompany(c.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                  <div className="col-span-4">Entreprise</div>
                  <div className="col-span-3">Ville</div>
                  <div className="col-span-3">Secteur</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {filtered.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-slate-50">
                    <div className="col-span-4">
                      <div className="font-semibold">{c.name}</div>
                      {c.website && (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-700 underline"
                        >
                          {c.website}
                        </a>
                      )}
                    </div>
                    <div className="col-span-3 text-slate-700">{c.city ?? "—"}</div>
                    <div className="col-span-3 text-slate-700">{c.sector ?? "—"}</div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        onClick={() => openEdit(c)}
                      >
                        Modifier
                      </button>
                      <button
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                        onClick={() => onDeleteCompany(c.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal create/edit */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <div className="text-lg font-semibold">{editingId ? "Modifier l’entreprise" : "Nouvelle entreprise"}</div>
                <div className="text-sm text-slate-500">Renseigne les informations principales</div>
              </div>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setOpen(false);
                  setEditingId(null);
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmitCompany} className="p-5">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Nom *</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Site web</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                    placeholder="https://..."
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Ville</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Secteur</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                    />
                  </div>
                </div>

                {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setOpen(false);
                      setEditingId(null);
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? (editingId ? "Modification..." : "Création...") : editingId ? "Enregistrer" : "Créer"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Small UI components ---------- */

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
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

function StatPill({ label, value, dotClass }: { label: string; value: number; dotClass: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={classNames("h-2 w-2 rounded-full", dotClass)} />
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function CompanyCard({ c, onDelete, onEdit }: { c: Company; onDelete: () => void; onEdit: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{c.name}</div>
          <div className="mt-1 text-sm text-slate-600">
            {c.city ? `📍 ${c.city}` : "📍 —"}
            {c.sector ? ` • ${c.sector}` : ""}
          </div>
          {c.website && (
            <a href={c.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-emerald-700 underline">
              {c.website}
            </a>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50" onClick={onEdit}>
            Modifier
          </button>
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50" onClick={onDelete}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center">
      <div className="text-4xl">🏢</div>
      <div className="mt-3 text-lg font-semibold">Aucune entreprise</div>
      <div className="mt-1 text-sm text-slate-500">Commence par créer ta première entreprise.</div>
      <button onClick={onCreate} className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        + Nouvelle entreprise
      </button>
    </div>
  );
}

function SkeletonCompanies({ view }: { view: ViewMode }) {
  if (view === "list") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
          Chargement...
        </div>
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-64 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-56 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-44 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}