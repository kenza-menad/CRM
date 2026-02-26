"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL!;

type PipelineRow = {
  status: string;
  total: number;
  total_value: string | number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API}/dashboard/pipeline`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erreur API");
        setRows(data);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [router]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      <div className="mt-6 grid gap-4">
        {rows.map((r) => (
          <div key={r.status} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-600">Statut</div>
            <div className="text-lg font-semibold">{r.status}</div>
            <div className="mt-2 text-sm">
              Total: <b>{r.total}</b> — Valeur: <b>{String(r.total_value)}</b> €
            </div>
          </div>
        ))}

        {rows.length === 0 && !error && (
          <p className="text-gray-600">Aucune donnée pour l’instant (ajoute des leads).</p>
        )}
      </div>
    </main>
  );
}