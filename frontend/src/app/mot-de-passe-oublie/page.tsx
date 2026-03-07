"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/mot-de-passe-oublie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      setStep("code");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur");
      setStep("done");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen flex bg-slate-50">
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-600 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="text-white font-semibold text-lg">FormaPro CRM</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Réinitialiser<br />votre mot de passe
          </h1>
          <p className="mt-4 text-emerald-100 text-lg">
            Un code à 6 chiffres vous sera envoyé par email.
          </p>
        </div>
        <p className="text-emerald-200 text-sm">© 2025 FormaPro CRM</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {step === "email" && "Mot de passe oublié 🔑"}
              {step === "code"  && "Entrez votre code 📬"}
              {step === "done"  && "Mot de passe mis à jour ✅"}
            </h2>
            <p className="mt-1 text-slate-500">
              {step === "email" && "Entrez votre email pour recevoir un code."}
              {step === "code"  && `Code envoyé à ${email}. Vérifiez vos spams.`}
              {step === "done"  && "Vous pouvez maintenant vous connecter."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

            {step === "done" ? (
              <button onClick={() => router.push("/login")}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
                Se connecter →
              </button>
            ) : step === "email" ? (
              <form onSubmit={sendCode} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input type="email" required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="votre@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">⚠️ {error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {loading ? "Envoi..." : "Envoyer le code →"}
                </button>
                <button type="button" onClick={() => router.push("/login")}
                  className="w-full rounded-xl border border-slate-200 py-3 text-sm text-slate-600 hover:bg-slate-50">
                  ← Retour à la connexion
                </button>
              </form>
            ) : (
              <form onSubmit={resetPassword} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-slate-700">Code à 6 chiffres</label>
                  <input required maxLength={6}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-center tracking-[0.5em] font-bold text-xl outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="000000"
                    value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Nouveau mot de passe</label>
                  <input type="password" required minLength={6}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="6 caractères minimum"
                    value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">⚠️ {error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {loading ? "Mise à jour..." : "Réinitialiser le mot de passe →"}
                </button>
                <button type="button" onClick={() => setStep("email")}
                  className="w-full rounded-xl border border-slate-200 py-3 text-sm text-slate-600 hover:bg-slate-50">
                  ← Changer d'email
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}