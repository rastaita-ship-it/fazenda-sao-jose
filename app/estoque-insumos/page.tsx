"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface Insumo {
  id: number;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade_atual: number;
  quantidade_minima: number | null;
  custo_unitario: number | null;
  setor_id: number | null;
  observacao: string | null;
}

const CATEGORIAS = [
  { valor: "fertilizante", rotulo: "Fertilizante" },
  { valor: "semente", rotulo: "Semente" },
  { valor: "defensivo", rotulo: "Defensivo" },
  { valor: "racao", rotulo: "Racao" },
  { valor: "medicamento", rotulo: "Medicamento" },
  { valor: "combustivel", rotulo: "Combustivel" },
  { valor: "outro", rotulo: "Outro" },
];

function rotuloCategoria(valor: string) {
  return CATEGORIAS.find((c) => c.valor === valor)?.rotulo ?? valor;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EstoqueInsumosPage() {
  const [itens, setItens] = useState<Insumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("fertilizante");
  const [unidade, setUnidade] = useState("kg");
  const [quantidadeInicial, setQuantidadeInicial] = useState("");
  const [quantidadeMinima, setQuantidadeMinima] = useState("");
  const [custoUnitario, setCustoUnitario] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [movimentandoId, setMovimentandoId] = useState<number | null>(null);
  const [tipoMovimento, setTipoMovimento] = useState<"entrada" | "saida">("entrada");
  const [quantidadeMovimento, setQuantidadeMovimento] = useState("");
  const [descricaoMovimento, setDescricaoMovimento] = useState("");
  const [erroMovimento, setErroMovimento] = useState("");
  const [salvandoMovimento, setSalvandoMovimento] = useState(false);

  function carregar() {
    setCarregando(true);
    fetch("/api/estoque-insumos")
      .then((r) => r.json())
      .then(setItens)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarNovo() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      await fetch("/api/estoque-insumos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          categoria,
          unidade,
          quantidade_atual: quantidadeInicial ? Number(quantidadeInicial.replace(",", ".")) : 0,
          quantidade_minima: quantidadeMinima ? Number(quantidadeMinima.replace(",", ".")) : null,
          custo_unitario: custoUnitario ? Number(custoUnitario.replace(",", ".")) : null,
        }),
      });
      setNome("");
      setQuantidadeInicial("");
      setQuantidadeMinima("");
      setCustoUnitario("");
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
      const res = await fetch("/api/estoque-insumos/movimentacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insumo_id: movimentandoId,
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
      <Header titulo="Estoque de Insumos" subtitulo="Adubo, racao, defensivos, combustivel..." />
      <div className="space-y-3 p-4">
        <button className="btn-primary w-full" onClick={() => setMostrarForm(true)}>
          + Adicionar insumo
        </button>

        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Carregando...</div>
        )}

        {!carregando && itens.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">
            Nenhum insumo cadastrado ainda.
          </div>
        )}

        {itens.map((item) => {
          const estoqueBaixo =
            item.quantidade_minima != null && item.quantidade_atual <= item.quantidade_minima;
          return (
            <div key={item.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.nome}</p>
                  <p className="text-xs text-neutral-500">{rotuloCategoria(item.categoria)}</p>
                  {item.custo_unitario != null && (
                    <p className="text-xs text-neutral-400">
                      {formatarMoeda(item.custo_unitario)} / {item.unidade}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${
                      estoqueBaixo ? "text-danger" : "text-neutral-900 dark:text-neutral-50"
                    }`}
                  >
                    {item.quantidade_atual} {item.unidade}
                  </p>
                  {estoqueBaixo && (
                    <p className="text-[11px] font-medium text-danger">Estoque baixo</p>
                  )}
                </div>
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
          );
        })}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo insumo</h2>
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
                placeholder="Nome (ex: Ureia, Racao bovina)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />

              <select className="input-field" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </select>

              <input
                className="input-field"
                placeholder="Unidade (kg, L, sc, un)"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Quantidade inicial
                  </label>
                  <input
                    className="input-field"
                    inputMode="decimal"
                    value={quantidadeInicial}
                    onChange={(e) => setQuantidadeInicial(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Estoque minimo
                  </label>
                  <input
                    className="input-field"
                    inputMode="decimal"
                    value={quantidadeMinima}
                    onChange={(e) => setQuantidadeMinima(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Custo por unidade (R$, opcional)
                </label>
                <input
                  className="input-field"
                  inputMode="decimal"
                  value={custoUnitario}
                  onChange={(e) => setCustoUnitario(e.target.value)}
                />
              </div>

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
                  tipoMovimento === "entrada" ? "Ex: Compra na cooperativa" : "Ex: Uso na adubacao do cafe"
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
