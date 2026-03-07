"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_TEMPLATES = [
  {
    name: "Bienvenue",
    subject: "Bienvenue chez nous ! 🎉",
    body: "Bonjour {{prenom}},\n\nNous sommes ravis de vous accueillir.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nL'équipe FormaPro",
  },
  {
    name: "Relance prospect",
    subject: "Suite à notre échange 📞",
    body: "Bonjour {{prenom}},\n\nJe me permets de vous recontacter suite à notre échange du {{date}}.\n\nAvez-vous eu l'occasion d'étudier notre proposition ?\n\nJe reste disponible pour toute question.\n\nCordialement,\n{{commercial}}",
  },
  {
    name: "Offre commerciale",
    subject: "Notre proposition pour {{entreprise}} 💼",
    body: "Bonjour {{prenom}},\n\nSuite à notre discussion, voici notre proposition adaptée à vos besoins :\n\n- Formation : {{formation}}\n- Durée : {{duree}}\n- Tarif : {{tarif}} €\n\nCette offre est valable jusqu'au {{date_expiration}}.\n\nCordialement,\n{{commercial}}",
  },
];

function cx(...xs: Array<string | false | undefined | null>) { return xs.filter(Boolean).join(" "); }

export default function EmailTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<Template | null>(null);
  const [isNew,     setIsNew]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [sendModal, setSendModal] = useState<Template | null>(null);
  const [sendTo,    setSendTo]    = useState("");
  const [sending,   setSending]   = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  // Form state
  const [formName,    setFormName]    = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody,    setFormBody]    = useState("");

  function getToken() {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/login"); return null; }
    return t;
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/emails/templates`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  function openNew() {
    setIsNew(true);
    setSelected(null);
    setFormName(""); setFormSubject(""); setFormBody("");
  }

  function openEdit(tpl: Template) {
    setIsNew(false);
    setSelected(tpl);
    setFormName(tpl.name);
    setFormSubject(tpl.subject);
    setFormBody(tpl.body);
  }

  function openDefault(d: typeof DEFAULT_TEMPLATES[0]) {
    setIsNew(true);
    setSelected(null);
    setFormName(d.name);
    setFormSubject(d.subject);
    setFormBody(d.body);
  }

  async function save() {
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) return;
    setSaving(true);
    const t = getToken(); if (!t) return;
    try {
      const url    = isNew ? `${API}/emails/templates` : `${API}/emails/templates/${selected!.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ name: formName.trim(), subject: formSubject.trim(), body: formBody.trim() }),
      });
      if (res.ok) {
        showToast(isNew ? "Template créé ✅" : "Template mis à jour ✅");
        setSelected(null); setIsNew(false);
        load();
      } else {
        showToast("Erreur lors de la sauvegarde", false);
      }
    } catch { showToast("Erreur réseau", false); }
    finally { setSaving(false); }
  }

  async function deleteTpl(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    setDeleting(id);
    const t = getToken(); if (!t) return;
    try {
      await fetch(`${API}/emails/templates/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      showToast("Template supprimé");
      if (selected?.id === id) { setSelected(null); setIsNew(false); }
      load();
    } catch { showToast("Erreur", false); }
    finally { setDeleting(null); }
  }

  async function sendFromTemplate() {
    if (!sendModal || !sendTo.trim()) return;
    setSending(true);
    const t = getToken(); if (!t) return;
    try {
      const res = await fetch(`${API}/emails/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          to_email: sendTo.trim(),
          subject:  sendModal.subject,
          body:     sendModal.body,
        }),
      });
      if (res.ok) {
        showToast(`Email envoyé à ${sendTo} ✅`);
        setSendModal(null); setSendTo("");
      } else {
        showToast("Erreur lors de l'envoi", false);
      }
    } catch { showToast("Erreur réseau", false); }
    finally { setSending(false); }
  }

  const NAV = [
    { label: "Dashboard",   path: "/dashboard",        icon: "📊" },
    { label: "Contacts",    path: "/contacts",          icon: "👤" },
    { label: "Entreprises", path: "/entreprises",       icon: "🏢" },
    { label: "Leads",       path: "/leads",             icon: "🎯" },
    { label: "Deals",       path: "/deals",             icon: "💼" },
    { label: "Pipeline",    path: "/pipeline",          icon: "📈" },
    { label: "Tâches",      path: "/tasks",             icon: "✅" },
    { label: "Utilisateurs",path: "/users",             icon: "👥" },
    { label: "Emails",      path: "/emails",            icon: "📧" },
    { label: "Templates",   path: "/emails/templates",  icon: "📝", active: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={cx(
          "fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all",
          toast.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        )}>
          {toast.msg}
        </div>
      )}

      <div className="flex">
        

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">📝 Modèles d'emails</h1>
              <p className="text-sm text-slate-400 mt-0.5">Créez et gérez vos templates de communication</p>
            </div>
            <button onClick={openNew}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
              + Nouveau template
            </button>
          </div>

          <div className="p-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Liste des templates */}
              <div className="lg:col-span-1 space-y-4">

                {/* Templates prêts à l'emploi */}
                {templates.length === 0 && !loading && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">🚀 Templates suggérés</p>
                    <div className="space-y-2">
                      {DEFAULT_TEMPLATES.map(d => (
                        <button key={d.name} onClick={() => openDefault(d)}
                          className="w-full text-left rounded-xl border border-slate-200 p-3 hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                          <p className="text-sm font-medium text-slate-800">{d.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{d.subject}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Templates sauvegardés */}
                {loading ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Chargement...</div>
                ) : templates.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Mes templates ({templates.length})</p>
                    {templates.map(tpl => (
                      <div key={tpl.id}
                        className={cx("rounded-xl border p-3 cursor-pointer transition-all",
                          selected?.id === tpl.id ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0" onClick={() => openEdit(tpl)}>
                            <p className="text-sm font-semibold text-slate-800 truncate">{tpl.name}</p>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{tpl.subject}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => setSendModal(tpl)}
                              className="text-xs text-emerald-600 hover:bg-emerald-100 rounded-lg px-2 py-1 transition-colors" title="Envoyer">
                              📤
                            </button>
                            <button onClick={() => openEdit(tpl)}
                              className="text-xs text-slate-400 hover:bg-slate-100 rounded-lg px-2 py-1 transition-colors" title="Modifier">
                              ✏️
                            </button>
                            <button onClick={() => deleteTpl(tpl.id)} disabled={deleting === tpl.id}
                              className="text-xs text-rose-400 hover:bg-rose-50 rounded-lg px-2 py-1 transition-colors" title="Supprimer">
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm text-slate-500">Aucun template sauvegardé</p>
                    <p className="text-xs text-slate-400 mt-1">Utilisez les suggestions ci-dessus ou créez le vôtre</p>
                  </div>
                )}
              </div>

              {/* Éditeur */}
              <div className="lg:col-span-2">
                {(isNew || selected) ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-800">
                        {isNew ? "✨ Nouveau template" : `✏️ Modifier : ${selected?.name}`}
                      </h2>
                      <button onClick={() => { setSelected(null); setIsNew(false); }} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Nom du template</label>
                      <input type="text" placeholder="Ex: Relance prospect"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        value={formName} onChange={e => setFormName(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Objet de l'email</label>
                      <input type="text" placeholder="Ex: Suite à notre échange..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        value={formSubject} onChange={e => setFormSubject(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">Contenu</label>
                      <div className="text-xs text-slate-400 mb-1">
                        Variables disponibles : <code className="bg-slate-100 px-1 rounded">{"{{prenom}}"}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{"{{nom}}"}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{"{{entreprise}}"}</code>{" "}
                        <code className="bg-slate-100 px-1 rounded">{"{{date}}"}</code>
                      </div>
                      <textarea
                        rows={10}
                        placeholder="Rédigez votre email..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none font-mono"
                        value={formBody} onChange={e => setFormBody(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <button onClick={() => { setSelected(null); setIsNew(false); }}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">
                        Annuler
                      </button>
                      <button onClick={save} disabled={!formName.trim() || !formSubject.trim() || !formBody.trim() || saving}
                        className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                        {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <div className="text-5xl mb-4">📝</div>
                    <p className="text-sm font-medium text-slate-600">Sélectionnez un template à modifier</p>
                    <p className="text-xs text-slate-400 mt-1">ou créez-en un nouveau</p>
                    <button onClick={openNew}
                      className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                      + Nouveau template
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal envoi depuis template */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setSendModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">📤 Envoyer le template</h2>
              <button onClick={() => setSendModal(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
              <p><span className="font-medium">Template :</span> {sendModal.name}</p>
              <p className="mt-1"><span className="font-medium">Objet :</span> {sendModal.subject}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Destinataire</label>
              <input type="email" placeholder="email@exemple.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                value={sendTo} onChange={e => setSendTo(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSendModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={sendFromTemplate} disabled={!sendTo.trim() || sending}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
                {sending ? "Envoi..." : "📤 Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}