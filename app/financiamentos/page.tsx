"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { useToast } from "@/components/ui/ToastContext";

interface Financiamento {
  id: number;
  instituicao: string;
  descricao: string;
  valor_parcela: number | null;
  proxima_parcela: string;
  periodicidade: string;
  tem_proagro: number;
  observacao: string | null;
  status: string;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string) {
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
}

function situacaoParcela(proximaParcela: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  if (proximaParcela < hoje) {
    return { rotulo: "Vencida", estilo: "bg-danger/10 text-danger" };
  }
  const emDias = Math.round(
    (new Date(proximaParcela + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000
  );
  if (emDias <= 7) {
    return { rotulo: emDias === 0 ? "Vence hoje" : `Vence em ${emDias}d`, estilo: "bg-warning/10 text-warning" };
  }
  return {
    rotulo: `Vence ${formatarData(proximaParcela)}`,
    estilo: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  };
}

export default function FinanciamentosPage() {
  const toast = useToast();
  const [financiamentos, setFinanciamentos] = useState<Financiamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [instituicao, setInstituicao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorParcela, setValorParcela] = useState("");
  const [proximaParcela, setProximaParcela] = useState("");
  const [periodicidade, setPeriodicidade] = useState("mensal");
  const [temProagro, setTemProagro] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function carregar() {
    setCarregando(true);
    fetch("/api/financiamentos")
      .then((r) => r.json())
      .then(setFinanciamentos)
      .catch(() => toast.erro("Nao foi possivel carregar os financiamentos."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setInstituicao("");
    setDescricao("");
    setValorParcela("");
    setProximaParcela("");
    setPeriodicidade("mensal");
    setTemProagro(false);
    setObservacao("");
    setErro("");
    setModalAberto(true);
  }

  function abrirEdicao(f: Financiamento) {
    setEditandoId(f.id);
    setInstituicao(f.instituicao);
    setDescricao(f.descricao);
    setValorParcela(f.valor_parcela != null ? String(f.valor_parcela) : "");
    setProximaParcela(f.proxima_parcela);
    setPeriodicidade(f.periodicidade);
    setTemProagro(!!f.tem_proagro);
    setObservacao(f.observacao ?? "");
    setErro("");
    setModalAberto(true);
  }

  async function salvar() {
    if (!instituicao.trim() || !descricao.trim() || !proximaParcela) {
      setErro("Preencha instituição, descrição e a data da próxima parcela.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const corpo = {
        instituicao: instituicao.trim(),
        descricao: descricao.trim(),
        valor_parcela: valorParcela ? Number(valorParcela.replace(",", ".")) : null,
        proxima_parcela: proximaParcela,
        periodicidade,
        tem_proagro: temProagro,
        observacao: observacao.trim() || null,
      };
      const url = editandoId ? `/api/financiamentos/${editandoId}` : "/api/financiamentos";
      const metodo = editandoId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!res.ok) {
        const data = await res.json();
        setErro(data.error ?? "Erro ao salvar financiamento.");
        return;
      }
      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function darBaixa(id: number) {
    try {
      const res = await fetch(`/api/financiamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dar_baixa: true }),
      });
      if (!res.ok) {
        toast.erro("Nao foi possivel registrar o pagamento. Tente novamente.");
        return;
      }
      toast.sucesso("Parcela paga. Próxima data atualizada.");
      carregar();
    } catch {
      toast.erro("Nao foi possivel registrar o pagamento. Verifique sua conexao.");
    }
  }

  async function excluir() {
    if (!editandoId) return;
    if (!window.confirm(`Excluir "${descricao}"?`)) return;
    try {
      const res = await fetch(`/api/financiamentos/${editandoId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.erro("Nao foi possivel excluir. Tente novamente.");
        return;
      }
      setModalAberto(false);
      carregar();
    } catch {
      toast.erro("Nao foi possivel excluir. Verifique sua conexao.");
    }
  }

  return (
    <>
      <Header titulo="Financiamentos" subtitulo="Parcelas de crédito rural e cobertura Proagro" />
      <div className="space-y-3 p-4 pb-24">
        {carregando ? (
          <div className="card animate-pulse text-center text-sm text-neutral-400">Carregando financiamentos...</div>
        ) : financiamentos.length === 0 ? (
          <div className="card text-center">
            <p className="text-sm text-neutral-500">
              Nenhum financiamento cadastrado ainda. Adicione um custeio, Pronaf ou outra linha de crédito pra
              acompanhar as parcelas.
            </p>
            <button className="btn-primary mt-4 w-full" onClick={abrirNovo}>
              + Novo financiamento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {financiamentos.map((f) => {
              const situacao = situacaoParcela(f.proxima_parcela);
              return (
                <div key={f.id} className="card">
                  <button onClick={() => abrirEdicao(f)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{f.descricao}</p>
                        <p className="text-xs text-neutral-500">
                          {f.instituicao}
                          {f.valor_parcela != null ? ` · ${formatarMoeda(f.valor_parcela)}` : ""}
                          {f.tem_proagro ? " · Proagro" : ""}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${situacao.estilo}`}>
                        {situacao.rotulo}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => darBaixa(f.id)}
                    className="mt-2 w-full rounded-xl border border-brand-600 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400"
                  >
                    Marcar parcela como paga
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {financiamentos.length > 0 && (
          <button className="btn-primary w-full" onClick={abrirNovo}>
            + Novo financiamento
          </button>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editandoId ? "Editar financiamento" : "Novo financiamento"}</h2>
              <button onClick={() => setModalAberto(false)} className="text-2xl leading-none text-neutral-400" aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Descrição</label>
                <input
                  className="input-field"
                  placeholder="Ex: Custeio safra 2026, Pronaf..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Instituição</label>
                <input
                  className="input-field"
                  placeholder="Ex: Banco do Brasil, cooperativa..."
                  value={instituicao}
                  onChange={(e) => setInstituicao(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Valor da parcela</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="input-field"
                    placeholder="0,00"
                    value={valorParcela}
                    onChange={(e) => setValorParcela(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Próxima parcela</label>
                  <input
                    type="date"
                    className="input-field"
                    value={proximaParcela}
                    onChange={(e) => setProximaParcela(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Periodicidade</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { valor: "mensal", rotulo: "Mensal" },
                    { valor: "anual", rotulo: "Anual" },
                  ].map((p) => (
                    <button
                      key={p.valor}
                      onClick={() => setPeriodicidade(p.valor)}
                      className={`rounded-xl border py-2 text-sm font-medium transition ${
                        periodicidade === p.valor
                          ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                      }`}
                    >
                      {p.rotulo}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={temProagro} onChange={(e) => setTemProagro(e.target.checked)} />
                Tem cobertura Proagro
              </label>

              <textarea
                className="input-field"
                rows={2}
                placeholder="Observação (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />

              {erro && <p className="text-sm text-danger">{erro}</p>}

              <button className="btn-primary w-full" disabled={salvando} onClick={salvar}>
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Salvar financiamento"}
              </button>
              {editandoId && (
                <button onClick={excluir} className="w-full rounded-xl border border-danger py-3 text-sm font-medium text-danger">
                  Excluir financiamento
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
