"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface Meta {
  id: number;
  titulo: string;
  tipo: string;
  setor_id: number | null;
  setor_nome: string | null;
  setor_cor: string | null;
  produto_id: number | null;
  produto_nome: string | null;
  produto_unidade: string | null;
  valor_meta: number;
  data_inicio: string;
  data_fim: string;
  observacao: string | null;
  status: string;
  progresso_atual: number;
  progresso_pct: number;
  ritmo_esperado_pct: number;
  dias_restantes: number;
  no_ritmo: boolean;
}

interface Setor {
  id: number;
  nome: string;
}

interface Produto {
  id: number;
  produto: string;
  unidade: string;
}

const TIPOS: { valor: string; rotulo: string }[] = [
  { valor: "lucro", rotulo: "Lucro" },
  { valor: "receita", rotulo: "Receita" },
  { valor: "producao", rotulo: "Produção" },
];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatarData(data: string) {
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
}
function rotuloTipo(tipo: string) {
  return TIPOS.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

export default function MetasPage() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("lucro");
  const [setorId, setSetorId] = useState<number | "">("");
  const [produtoId, setProdutoId] = useState<number | "">("");
  const [valorMeta, setValorMeta] = useState("");
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function carregar() {
    setCarregando(true);
    fetch("/api/metas")
      .then((r) => r.json())
      .then(setMetas)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    fetch("/api/sectors").then((r) => r.json()).then(setSetores);
    fetch("/api/estoque-producao").then((r) => r.json()).then(setProdutos);
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setTitulo("");
    setTipo("lucro");
    setSetorId("");
    setProdutoId("");
    setValorMeta("");
    setDataInicio(new Date().toISOString().slice(0, 10));
    setDataFim("");
    setObservacao("");
    setErro("");
    setModalAberto(true);
  }

  function abrirEdicao(m: Meta) {
    setEditandoId(m.id);
    setTitulo(m.titulo);
    setTipo(m.tipo);
    setSetorId(m.setor_id ?? "");
    setProdutoId(m.produto_id ?? "");
    setValorMeta(String(m.valor_meta));
    setDataInicio(m.data_inicio);
    setDataFim(m.data_fim);
    setObservacao(m.observacao ?? "");
    setErro("");
    setModalAberto(true);
  }

  async function salvar() {
    if (!titulo.trim() || !valorMeta || !dataFim) {
      setErro("Preencha titulo, valor da meta e data final.");
      return;
    }
    if (tipo === "producao" && !produtoId) {
      setErro("Escolha o produto para uma meta de producao.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const corpo = {
        titulo: titulo.trim(),
        tipo,
        setor_id: tipo !== "producao" ? setorId || null : null,
        produto_id: tipo === "producao" ? produtoId || null : null,
        valor_meta: Number(valorMeta.replace(",", ".")),
        data_inicio: dataInicio,
        data_fim: dataFim,
        observacao: observacao.trim() || null,
      };
      const url = editandoId ? `/api/metas/${editandoId}` : "/api/metas";
      const metodo = editandoId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!res.ok) {
        const dados = await res.json();
        setErro(dados.error ?? "Erro ao salvar meta.");
        return;
      }
      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function arquivar() {
    if (!editandoId) return;
    await fetch(`/api/metas/${editandoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "arquivada" }),
    });
    setModalAberto(false);
    carregar();
  }

  async function excluir() {
    if (!editandoId) return;
    if (!window.confirm(`Excluir a meta "${titulo}"?`)) return;
    await fetch(`/api/metas/${editandoId}`, { method: "DELETE" });
    setModalAberto(false);
    carregar();
  }

  return (
    <>
      <Header titulo="Metas" subtitulo="Acompanhe o progresso da safra" />
      <div className="space-y-3 p-4 pb-24">
        {carregando ? (
          <div className="card animate-pulse text-center text-sm text-neutral-400">Carregando metas...</div>
        ) : metas.length === 0 ? (
          <div className="card text-center">
            <p className="text-sm text-neutral-500">Nenhuma meta cadastrada ainda.</p>
            <button className="btn-primary mt-4 w-full" onClick={abrirNovo}>
              + Nova meta
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {metas.map((m) => {
              const concluida = m.progresso_pct >= 100;
              const corBarra = concluida ? "bg-brand-500" : m.no_ritmo ? "bg-brand-500" : "bg-warning";
              const unidade = m.tipo === "producao" ? m.produto_unidade ?? "" : "";
              return (
                <button key={m.id} onClick={() => abrirEdicao(m)} className="card block w-full text-left">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{m.titulo}</p>
                    {concluida && (
                      <span className="flex-shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        Concluída
                      </span>
                    )}
                  </div>
                  <p className="mb-2 text-xs text-neutral-500">
                    {rotuloTipo(m.tipo)}
                    {m.setor_nome ? ` · ${m.setor_nome}` : ""}
                    {m.produto_nome ? ` · ${m.produto_nome}` : ""}
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className={`h-full ${corBarra}`} style={{ width: `${Math.min(100, m.progresso_pct)}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">
                      {m.tipo === "producao"
                        ? `${m.progresso_atual.toLocaleString("pt-BR")} de ${m.valor_meta.toLocaleString("pt-BR")} ${unidade}`
                        : `${formatarMoeda(m.progresso_atual)} de ${formatarMoeda(m.valor_meta)}`}
                    </span>
                    <span className={concluida ? "font-semibold text-brand-600 dark:text-brand-400" : m.no_ritmo ? "text-neutral-400" : "font-medium text-warning"}>
                      {m.progresso_pct}%{!concluida && !m.no_ritmo ? " · atrasada" : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Até {formatarData(m.data_fim)} · {m.dias_restantes > 0 ? `${m.dias_restantes} dias restantes` : "prazo encerrado"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {metas.length > 0 && (
          <button className="btn-primary w-full" onClick={abrirNovo}>
            + Nova meta
          </button>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editandoId ? "Editar meta" : "Nova meta"}</h2>
              <button onClick={() => setModalAberto(false)} className="text-2xl leading-none text-neutral-400" aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="input-field"
                placeholder="Ex: Lucro da safra 2026"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.valor}
                      onClick={() => setTipo(t.valor)}
                      className={`rounded-xl border py-2 text-sm font-medium transition ${
                        tipo === t.valor
                          ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                      }`}
                    >
                      {t.rotulo}
                    </button>
                  ))}
                </div>
              </div>

              {tipo !== "producao" ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Setor (opcional)</label>
                  <select className="input-field" value={setorId} onChange={(e) => setSetorId(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">Fazenda toda</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Produto</label>
                  <select className="input-field" value={produtoId} onChange={(e) => setProdutoId(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">Selecione</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.produto} ({p.unidade})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  {tipo === "producao" ? "Meta (na unidade do produto)" : "Meta (R$)"}
                </label>
                <input className="input-field" inputMode="decimal" value={valorMeta} onChange={(e) => setValorMeta(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Início</label>
                  <input type="date" className="input-field" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Fim (safra)</label>
                  <input type="date" className="input-field" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </div>
              </div>

              <textarea
                className="input-field"
                rows={2}
                placeholder="Observação (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />

              {erro && <p className="text-sm text-danger">{erro}</p>}

              <button className="btn-primary w-full" disabled={salvando} onClick={salvar}>
                {salvando ? "Salvando..." : "Salvar meta"}
              </button>
              {editandoId && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={arquivar} className="rounded-xl border border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                    Arquivar
                  </button>
                  <button onClick={excluir} className="rounded-xl border border-danger py-2.5 text-sm font-medium text-danger">
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
