"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { useAuth } from "@/components/auth/AuthContext";

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
            {usuario?.tipo === "chefe" ? "Administrador" : "Funcionario de campo"}
          </p>
        </div>

        {usuario?.tipo === "chefe" && (
          <a
            href="/funcionarios"
            className="card flex items-center justify-between"
          >
            <span className="text-sm font-medium">Gerenciar funcionarios</span>
            <span className="text-neutral-400">{">"}</span>
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
