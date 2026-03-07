"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// Pages qui n'ont PAS de sidebar (auth)
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth"];

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "commercial" | "user";
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  const isAuthPage = AUTH_ROUTES.some(r => pathname.startsWith(r));

  useEffect(() => {
    if (isAuthPage) return;
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    // Decode JWT pour récupérer le nom / rôle sans appel API
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      // Si le token a 'name' (format: "Prénom Nom") on le découpe
      const nameParts = (payload.name || "").split(" ");
      setUser({
        id:         payload.sub,
        first_name: nameParts[0] || "",
        last_name:  nameParts.slice(1).join(" ") || "",
        email:      payload.email || "",
        role:       payload.role || "user",
      });
    } catch {
      router.push("/login");
    }
  }, [pathname]);

  // Pages auth → pas de sidebar
  if (isAuthPage) return <>{children}</>;

  function initials(u: User | null) {
    if (!u) return "?";
    return `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar fixe desktop */}
      <Sidebar
        userRole={user?.role ?? "user"}
        userName={user ? `${user.first_name} ${user.last_name}`.trim() : "Chargement..."}
        userInitials={initials(user)}
      />

      {/* Contenu principal */}
      <main className="flex-1 min-w-0 flex flex-col
        pt-[57px] md:pt-0          
        pb-[64px] md:pb-0">
        {children}
      </main>
    </div>
  );
}