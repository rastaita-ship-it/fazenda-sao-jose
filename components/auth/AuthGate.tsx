"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface Usuario {
  id: number;
  nome: string;
  tipo: string;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setUsuario);
  }, [pathname]);

  useEffect(() => {
    if (usuario === undefined) return;
    if (!usuario && pathname !== "/login") {
      router.push("/login");
    }
  }, [usuario, pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (usuario === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-sm text-neutral-400">Carregando...</p>
      </div>
    );
  }

  if (!usuario) {
    return null;
  }

  return <>{children}</>;
}
