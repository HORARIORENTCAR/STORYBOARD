"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useApp } from "@/lib/store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

export function Shell({ children }: { children: React.ReactNode }) {
  const { loggedIn, loading, currentUser } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!loggedIn && pathname !== "/login" && !pathname.startsWith("/auth")) {
      router.replace("/login");
      return;
    }
    /* Quien entró por el enlace de invitación y todavía no eligió contraseña
       debe hacerlo antes de usar la plataforma; si no, no podría volver a entrar. */
    if (loggedIn && currentUser?.status === "invited" && !pathname.startsWith("/auth")) {
      router.replace("/auth/callback");
    }
  }, [loading, loggedIn, currentUser, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] text-sm text-ink-500">
        Cargando Staff Board...
      </div>
    );
  }
  if (!loggedIn) return null;

  return (
    <div className="min-h-screen bg-[#f6f8f7]">
      <Sidebar />
      <div className="lg:pl-[272px]">
        <Topbar />
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 sm:py-8 lg:pb-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
