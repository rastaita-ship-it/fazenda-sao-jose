"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Setor } from "@/lib/types";
import { useToast } from "@/components/ui/ToastContext";

interface Grupo {
  descricao: string;
  tipo: "receita" | "despesa";
  qtd: number;
  total: number;
  primeira_data: string;
  ultima_data: string;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string) {
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
}

export default function CategorizarPage() {
  const toast = useToast();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [escolha, setEscolha] = useState<Record<string, number | "">>({});
  const [aplicando, setAplicando] = useState<string | null>(null);

  useEffect(() => {
    // carregando ja nasce true; buscar direto aqui evita repetir os sets
    // sincronos que carregar() faz (usada tambem no recarregar manual).
    fetch("/api/transactions/categorizar")
      .then((r) => r.json())
      .then((dados) => {
        setSetores(dados.setores ?? []);
        setGrupos(dados.grupos ?? []);
      })
      .finally(() => setCarregando(false));
  }, []);

  function carregar() {
    setCarregando(true);
    fetch("/api/transactions/categorizar")
      .then((r) => r.json())
      .then((dados) => {
        setSetores(dados.setores ?? []);
        setGrupos(dados.grupos ?? []);
      })
      .finally(() => setCarregando(false));
  }

  async function aplicar(grupo: Grupo) {
    const setorId = escolha[grupo.descricao + grupo.tipo];
    if (!setorId) {
      toast.erro("Escolha um setor antes de aplicar.");
      return;
    }
    setAplicando(grupo.descricao + grupo.tipo);
    try {
      const res = await fetch("/api/transactions/categorizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: grupo.descricao, tipo: grupo.tipo, setor_id: setorId }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => ({}));
        toast.erro(dados.error ?? "Nao foi possivel categorizar.");
        return;
      }
      const nomeSetor = setores.find((s) => s.id === setorId)?.nome ?? "setor escolhido";
      toast.sucesso(`${grupo.qtd} lancamento(s) movido(s) para ${nomeSetor}.`);
      setGrupos((atual) => atual.filter((g) => !(g.descricao === grupo.descricao && g.tipo === grupo.tipo)));
    } finally {
      setAplicando(null);
    }
  }

  const gruposFiltrados = busca.trim()
    ? grupos.filter((g) => g.descricao.toLowerCase().includes(busca.trim().toLowerCase()))
    : grupos;

  const totalPendente = grupos.reduce((soma, g) => soma + g.qtd, 0);
  const valorPendente = grupos.reduce(
    (soma, g) => soma + (g.tipo === "despesa" ? -g.total : g.total),
    0
  );

  return (
    <>
      <Header
        titulo="Categorizar Lançamentos"
        subtitulo={
          carregando
            ? "Carregando..."
            : `${grupos.length} grupos · ${totalPendente} lançamentos · ${formatarMoeda(valorPendente)} ainda sem setor`
        }
      />
      <div className="space-y-3 p-4 pb-24">
        {!carregando && grupos.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">
            Tudo categorizado — nenhum lançamento pendente em Geral/Administrativo.
          </div>
        )}

        {!carregando && grupos.length > 0 && (
          <input
            type="text"
            placeholder="Buscar por nome ou fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input-base"
          />
        )}

        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Carregando lançamentos...</div>
        )}

        {gruposFiltrados.map((grupo) => {
          const chave = grupo.descricao + grupo.tipo;
          return (
            <div key={chave} className="card">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{grupo.descricao}</p>
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    grupo.tipo === "receita"
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {grupo.tipo === "receita" ? "+" : "-"}
                  {formatarMoeda(grupo.total)}
                </span>
              </div>
              <p className="mb-3 text-xs text-neutral-400">
                {grupo.qtd} lançamento{grupo.qtd > 1 ? "s" : ""} · {formatarData(grupo.primeira_data)}
                {grupo.primeira_data !== grupo.ultima_data && ` a ${formatarData(grupo.ultima_data)}`}
              </p>
              <div className="flex gap-2">
                <select
                  value={escolha[chave] ?? ""}
                  onChange={(e) =>
                    setEscolha((atual) => ({
                      ...atual,
                      [chave]: e.target.value ? Number(e.target.value) : "",
                    }))
                  }
                  className="input-base flex-1"
                >
                  <option value="">Escolher setor...</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => aplicar(grupo)}
                  disabled={aplicando === chave}
                  className="btn-primary flex-shrink-0 px-4"
                >
                  {aplicando === chave ? "..." : "Aplicar"}
                </button>
              </div>
            </div>
          );
        })}

        {!carregando && grupos.length > 0 && (
          <button onClick={carregar} className="w-full text-center text-xs text-neutral-400">
            Recarregar lista
          </button>
        )}
      </div>
    </>
  );
}
