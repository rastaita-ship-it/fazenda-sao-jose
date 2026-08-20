"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthContext, Usuario } from "./AuthContext";

const PAGINAS_ADMIN = [
  "/fluxo-caixa",
  "/balanco",
  "/indicadores",
  "/patrimonio",
  "/estoque",
  "/setores",
  "/talhoes",
  "/animais",
  "/documentos",
  "/combustivel",
  "/importar",
  "/metas",
  "/historico-precos",
  "/funcionarios",
  "/financiamentos",
  "/categorizar",
];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- precisa voltar pro estado "carregando" a cada troca de rota
    setUsuario(undefined);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((dados) => {
        if (cancelado) return;
        setUsuario(dados);
        // A decisao de redirecionar fica dentro do proprio fetch (em vez de
        // um segundo useEffect que reage a `usuario`) de proposito: um
        // efeito separado rodaria na mesma passada que este, usando o
        // valor de `usuario` de ANTES da troca de pathname (ex: null, por
        // ter acabado de sair do /login) — e foi exatamente isso que fazia
        // o app mandar o usuario de volta pro /login um instante depois de
        // um login valido.
        if (!dados && pathname !== "/login") {
          router.push("/login");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [pathname, router]);

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
          <button onClick={() => router.push("/ponto")} className="btn-primary mt-6">
            Ir para o Ponto
          </button>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={usuario}>{children}</AuthContext.Provider>;
}
