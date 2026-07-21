"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthContext, Usuario } from "./AuthContext";

const PAGINAS_ADMIN = [
  "/fluxo-caixa",
  "/balanco",
  "/indicadores",
  "/patrimonio",
  "/estoque-insumos",
  "/estoque-producao",
  "/setores",
];

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

  const ehPaginaAdmin = PAGINAS_ADMIN.some((p) => pathname.startsWith(p));
  if (ehPaginaAdmin && usuario.tipo !== "chefe") {
    return (
      <AuthContext.Provider value={usuario}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6 text-center dark:bg-neutral-950">
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Acesso restrito
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Essa area e apenas para administradores.
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn-primary mt-6"
          >
            Voltar ao inicio
          </button>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={usuario}>{children}</AuthContext.Provider>;
}
