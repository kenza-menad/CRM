"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        }),
      });
      const text = await res.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch {}
      if (!res.ok) throw new Error(data?.error || text || `HTTP ${res.status}`);
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex bg-slate-50">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-600 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="text-white font-semibold text-lg">FormaPro CRM</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Rejoignez<br />FormaPro CRM
          </h1>
          <p className="mt-4 text-emerald-100 text-lg">
            Créez votre compte et commencez à gérer vos clients dès aujourd'hui.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: "✅", label: "Gratuit et sans engagement" },
              { icon: "🔒", label: "Données sécurisées" },
              { icon: "📧", label: "Email de bienvenue automatique" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <span>{icon}</span>
                </div>
                <span className="text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-emerald-200 text-sm">© 2025 FormaPro CRM — Marketing Digital</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
            <span className="font-semibold">FormaPro CRM</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Créer un compte 🚀</h2>
            <p className="mt-1 text-slate-500">Rejoignez votre équipe sur FormaPro CRM</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <form onSubmit={onSubmit} className="space-y-5">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Prénom</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    placeholder="Marie"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Nom</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    placeholder="Dupont"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  type="email"
                  placeholder="marie@entreprise.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Mot de passe</label>
                <div className="relative mt-1">
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all pr-12"
                    type={showPassword ? "text" : "password"}
                    placeholder="6 caractères minimum"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    
                  </button>
                </div>
                {password.length > 0 && password.length < 6 && (
                  <p className="mt-1 text-xs text-rose-500">Minimum 6 caractères</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Création du compte...
                  </span>
                ) : "Créer mon compte →"}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs text-slate-400 bg-white px-2">ou</div>
              </div>

              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => router.push("/login")}
              >
                Déjà un compte ? Se connecter
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}