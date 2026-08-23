"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { useAuth } from "@/components/auth/AuthContext";
import NotificacoesPush from "@/components/pwa/NotificacoesPush";

export default function ConfiguracoesPage() {
  const usuario = useAuth();
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <Header titulo="Configuracoes" subtitulo="Sua conta e preferencias" />
      <div className="space-y-3 p-4">
        <div className="card">
          <p className="text-xs text-neutral-500">Logado como</p>
          <p className="text-base font-semibold">{usuario?.nome}</p>
          <p className="text-xs text-neutral-400">
            {usuario?.tipo === "chefe" ? "Administrador" : "Colaborador"}
          </p>
        </div>

        <NotificacoesPush />

        {usuario?.tipo === "chefe" && (
          <a
            href="/funcionarios"
            className="card flex items-center justify-between"
          >
            <span className="text-sm font-medium">Gerenciar funcionarios</span>
            <span className="text-neutral-400">{">"}</span>
          </a>
        )}

        {usuario?.tipo === "chefe" && (
          <a
            href="/api/backup/planilha"
            className="card flex items-center justify-between"
          >
            <div>
              <span className="text-sm font-medium">Baixar planilha com todos os dados</span>
              <p className="text-xs text-neutral-400">
                Abre no Excel, Google Sheets ou Numbers. Uma aba por tabela (transacoes, setores,
                funcionarios, animais, etc.) — serve pra conferir e como backup.
              </p>
            </div>
            <span className="text-neutral-400 flex-shrink-0">{"⬇"}</span>
          </a>
        )}

        {usuario?.tipo === "chefe" && (
          <a
            href="/api/backup"
            className="card flex items-center justify-between"
          >
            <div>
              <span className="text-sm font-medium">Backup tecnico (.db)</span>
              <p className="text-xs text-neutral-400">
                Copia bruta do banco de dados. Nao abre em nada do celular/computador — e so pra
                restaurar tudo caso algo dê muito errado.
              </p>
            </div>
            <span className="text-neutral-400 flex-shrink-0">{"⬇"}</span>
          </a>
        )}

        <button
          onClick={sair}
          className="btn-danger w-full"
        >
          Sair da conta
        </button>
      </div>
    </>
  );
}
