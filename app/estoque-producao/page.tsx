"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface Produto {
  id: number;
  produto: string;
  setor_id: number | null;
  setor_nome: string | null;
  unidade: string;
  quantidade_atual: number;
  local_armazenamento: string | null;
  observacao: string | null;
}

interface Setor {
  id: number;
  nome: string;
}

export default function EstoqueProducaoPage() {
  const [itens, setItens] = useState<Produto[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [produto, setProduto] = useState("");
  const [setorId, setSetorId] = useState<number | "">("");
  const [unidade, setUnidade] = useState("sc");
  const [quantidadeInicial, setQuantidadeInicial] = useState("");
  const [localArmazenamento, setLocalArmazenamento] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [movimentandoId, setMovimentandoId] = useState<number | null>(null);
  const [tipoMovimento, setTipoMovimento] = useState<"entrada" | "saida">("entrada");
  const [quantidadeMovimento, setQuantidadeMovimento] = useState("");
  const [descricaoMovimento, setDescricaoMovimento] = useState("");
  const [erroMovimento, setErroMovimento] = useState("");
  const [salvandoMovimento, setSalvandoMovimento] = useState(false);

  function carregar() {
    setCarregando(true);
    fetch("/api/estoque-producao")
      .then((r) => r.json())
      .then(setItens)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    fetch("/api/sectors").then((r) => r.json()).then(setSetores);
  }, []);

  async function salvarNovo() {
    if (!produto.trim() || !unidade.trim()) return;
    setSalvando(true);
    try {
      await fetch("/api/estoque-producao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto: produto.trim(),
          setor_id: setorId || null,
          unidade: unidade.trim(),
          quantidade_atual: quantidadeInicial ? Number(quantidadeInicial.replace(",", ".")) : 0,
          local_armazenamento: localArmazenamento.trim() || null,
        }),
      });
      setProduto("");
      setQuantidadeInicial("");
      setLocalArmazenamento("");
      setMostrarForm(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  function abrirMovimento(id: number, tipo: "entrada" | "saida") {
    setMovimentandoId(id);
    setTipoMovimento(tipo);
    setQuantidadeMovimento("");
    setDescricaoMovimento("");
    setErroMovimento("");
  }

  async function salvarMovimento() {
    if (!movimentandoId || !quantidadeMovimento) return;
    setSalvandoMovimento(true);
    setErroMovimento("");
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/estoque-producao/movimentacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: movimentandoId,
          tipo: tipoMovimento,
          quantidade: Number(quantidadeMovimento.replace(",", ".")),
          data: hoje,
          descricao: descricaoMovimento.trim() || null,
        }),
      });
      const dados = await res.json();
      if (!res.ok) {
        setErroMovimento(dados.error ?? "Erro ao registrar movimentacao.");
        return;
      }
      setMovimentandoId(null);
      carregar();
    } finally {
      setSalvandoMovimento(false);
    }
  }

  return (
    <>
      <Header titulo="Estoque de Producao" subtitulo="Cafe, leite, la e outros produtos armazenados" />
      <div className="space-y-3 p-4">
        <button className="btn-primary w-full" onClick={() => setMostrarForm(true)}>
          + Adicionar produto
        </button>

        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Carregando...</div>
        )}

        {!carregando && itens.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">
            Nenhum produto cadastrado ainda.
          </div>
        )}

        {itens.map((item) => (
          <div key={item.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.produto}</p>
                {item.setor_nome && <p className="text-xs text-neutral-500">{item.setor_nome}</p>}
                {item.local_armazenamento && (
                  <p className="text-xs text-neutral-400">{item.local_armazenamento}</p>
                )}
              </div>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                {item.quantidade_atual} {item.unidade}
              </p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => abrirMovimento(item.id, "entrada")}
                className="rounded-xl border border-brand-600 py-2 text-sm font-medium text-brand-600 dark:text-brand-400"
              >
                + Entrada
              </button>
              <button
                onClick={() => abrirMovimento(item.id, "saida")}
                className="rounded-xl border border-danger py-2 text-sm font-medium text-danger"
              >
                - Saida
              </button>
            </div>
          </div>
        ))}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo produto</h2>
              <button
                onClick={() => setMostrarForm(false)}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="input-field"
                placeholder="Produto (ex: Cafe beneficiado, Leite)"
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
              />

              <select
                className="input-field"
                value={setorId}
                onChange={(e) => setSetorId(Number(e.target.value))}
              >
                <option value="">Setor (opcional)</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>

              <input
                className="input-field"
                placeholder="Unidade (sc, L, kg, un)"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
              />

              <input
                className="input-field"
                inputMode="decimal"
                placeholder="Quantidade inicial"
                value={quantidadeInicial}
                onChange={(e) => setQuantidadeInicial(e.target.value)}
              />

              <input
                className="input-field"
                placeholder="Local de armazenamento (opcional)"
                value={localArmazenamento}
                onChange={(e) => setLocalArmazenamento(e.target.value)}
              />

              <button className="btn-primary w-full" disabled={salvando} onClick={salvarNovo}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {movimentandoId && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {tipoMovimento === "entrada" ? "Registrar entrada" : "Registrar saida"}
              </h2>
              <button
                onClick={() => setMovimentandoId(null)}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="input-field"
                inputMode="decimal"
                placeholder="Quantidade"
                value={quantidadeMovimento}
                onChange={(e) => setQuantidadeMovimento(e.target.value)}
              />
              <input
                className="input-field"
                placeholder={
                  tipoMovimento === "entrada" ? "Ex: Colheita do dia" : "Ex: Venda para cooperativa"
                }
                value={descricaoMovimento}
                onChange={(e) => setDescricaoMovimento(e.target.value)}
              />
              {erroMovimento && <p className="text-sm text-danger">{erroMovimento}</p>}
              <button
                className={tipoMovimento === "entrada" ? "btn-primary w-full" : "btn-danger w-full"}
                disabled={salvandoMovimento}
                onClick={salvarMovimento}
              >
                {salvandoMovimento ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
