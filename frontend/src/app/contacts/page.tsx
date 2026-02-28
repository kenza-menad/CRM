"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Company = {
  id: string; // UUID
  name: string;
};

type Contact = {
  id: string; // UUID
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  history: string | null;
  company_id: string | null; // UUID
  company_name?: string | null;
  created_at?: string;
};

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export default function ContactsPage() {
  const router = useRouter();

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [companyId, setCompanyId] = useState<string>("all");

  // modal create/edit
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // ✅ UUID

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState<string>(""); // company_id uuid
  const [history, setHistory] = useState("");

  function requireTokenOrRedirect() {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return null;
    }
    return t;
  }

  async function loadCompanies() {
    const t = requireTokenOrRedirect();
    if (!t) return;

    try {
      const res = await fetch(`${API}/companies`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur companies (${res.status})`);

      setCompanies(
        Array.isArray(data)
          ? data.map((x: any) => ({
              id: String(x.id), // ✅ UUID string
              name: String(x.name),
            }))
          : []
      );
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les entreprises");
    }
  }

  async function loadContacts() {
    setError(null);
    setLoading(true);

    const t = requireTokenOrRedirect();
    if (!t) return;

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (companyId !== "all") params.set("companyId", companyId);

      const res = await fetch(`${API}/contacts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erreur contacts (${res.status})`);

      setContacts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les contacts");
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
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function openCreate() {
    setError(null);
    setEditingId(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setHistory("");
    setOpen(true);
  }

  function openEdit(c: Contact) {
    setError(null);
    setEditingId(c.id); // ✅ UUID string
    setFirstName(c.first_name ?? "");
    setLastName(c.last_name ?? "");
    setEmail(c.email ?? "");
    setPhone(c.phone ?? "");
    setCompany(c.company_id ? String(c.company_id) : "");
    setHistory(c.history ?? "");
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const t = requireTokenOrRedirect();
    if (!t) return;

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Prénom, nom et email sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      const isEdit = typeof editingId === "string" && editingId.length > 0;

      const url = `${API}/contacts${isEdit ? `/${editingId}` : ""}`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          history: history.trim() || null,
          company_id: company ? company : null, // ✅ UUID string, PAS Number()
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error || (isEdit ? `Erreur modification (${res.status})` : `Erreur création (${res.status})`)
        );
      }

      setOpen(false);
      setEditingId(null);
      await loadContacts();
    } catch (e: any) {
      setError(e?.message || (editingId ? "Erreur modification" : "Erreur création"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);

    const t = requireTokenOrRedirect();
    if (!t) return;

    const ok = confirm("Supprimer ce contact ?");
    if (!ok) return;

    try {
      const res = await fetch(`${API}/contacts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Erreur suppression (${res.status})`);

      setContacts((prev) => prev.filter((c) => c.id !== id));
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
              <SidebarItem active label="Contacts" onClick={() => router.push("/contacts")} />
              <SidebarItem label="Entreprises" onClick={() => router.push("/entreprises")} />
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
                  <h1 className="text-xl font-semibold">Contacts</h1>
                  <p className="text-sm text-slate-500">Gérez vos contacts et leur entreprise associée</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    title="Rafraîchir"
                    onClick={loadContacts}
                  >
                    ⟳
                  </button>
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                    onClick={openCreate}
                  >
                    + Nouveau contact
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-col gap-3 md:flex-row">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-slate-300">
                      <span className="text-slate-400">🔎</span>
                      <input
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="Rechercher (nom, email, téléphone)..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") loadContacts();
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none hover:bg-slate-50 focus:border-slate-300"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      title="Filtrer par entreprise"
                    >
                      <option value="all">Toutes les entreprises</option>
                      {companies.map((co) => (
                        <option key={co.id} value={co.id}>
                          {co.name}
                        </option>
                      ))}
                    </select>

                    <button
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={loadContacts}
                      title="Appliquer filtres"
                    >
                      Filtrer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-6">
            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <div className="font-semibold">Erreur</div>
                <div className="mt-1 text-rose-700">{error}</div>
              </div>
            )}

            {loading ? (
              <SkeletonContacts />
            ) : contacts.length === 0 ? (
              <EmptyState onCreate={openCreate} />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                  <div className="col-span-4">Contact</div>
                  <div className="col-span-3">Entreprise</div>
                  <div className="col-span-3">Téléphone</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {contacts.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-slate-50">
                    <div className="col-span-4">
                      <div className="font-semibold">
                        {c.first_name} {c.last_name}
                      </div>
                      <div className="text-xs text-slate-600">{c.email}</div>
                    </div>
                    <div className="col-span-3 text-slate-700">{c.company_name || "—"}</div>
                    <div className="col-span-3 text-slate-700">{c.phone || "—"}</div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        onClick={() => openEdit(c)}
                      >
                        Modifier
                      </button>
                      <button
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                        onClick={() => onDelete(c.id)}
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
                <div className="text-lg font-semibold">{editingId ? "Modifier le contact" : "Nouveau contact"}</div>
                <div className="text-sm text-slate-500">Associe-le à une entreprise si besoin</div>
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

            <form onSubmit={onSubmit} className="p-5">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Prénom *</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nom *</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Téléphone</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Entreprise</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  >
                    <option value="">Aucune</option>
                    {companies.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Historique / Notes</label>
                  <textarea
                    className="mt-1 min-h-[90px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
                    value={history}
                    onChange={(e) => setHistory(e.target.value)}
                    placeholder="Ex: Appelé le 12/02, intéressé par formation SEO..."
                  />
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-center">
      <div className="text-4xl">👤</div>
      <div className="mt-3 text-lg font-semibold">Aucun contact</div>
      <div className="mt-1 text-sm text-slate-500">Crée ton premier contact et associe-le à une entreprise.</div>
      <button
        onClick={onCreate}
        className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        + Nouveau contact
      </button>
    </div>
  );
}

function SkeletonContacts() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
        Chargement...
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-64 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}