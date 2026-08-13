"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { useToast } from "@/components/ui/ToastContext";

interface Producao {
  unidade: string;
  total: number;
  por_hectare: number | null;
}

interface TalhaoResumo {
  id: number;
  setor_id: number;
  nome: string;
  area_hectares: number | null;
  observacao: string | null;
  setor_nome: string;
  setor_cor: string;
  receitas: number;
  despesas: number;
  saldo: number;
  producao: Producao[];
  lotacao_ua_ha: number | null;
  qtd_animais_pesados: number;
  qtd_animais_total: number;
}

interface Setor {
  id: number;
  nome: string;
  cor: string;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarNumero(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default function TalhoesPage() {
  const toast = useToast();
  const [talhoes, setTalhoes] = useState<TalhaoResumo[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [setorId, setSetorId] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [area, setArea] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function carregar() {
    setCarregando(true);
    Promise.all([
      fetch("/api/talhoes/resumo").then((r) => r.json()),
      fetch("/api/sectors").then((r) => r.json()),
    ])
      .then(([resumo, setoresData]) => {
        setTalhoes(resumo);
        setSetores(setoresData);
      })
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo(setorPreSelecionado?: number) {
    setEditandoId(null);
    setSetorId(setorPreSelecionado ?? setores[0]?.id ?? null);
    setNome("");
    setArea("");
    setObservacao("");
    setErro("");
    setModalAberto(true);
  }

  function abrirEdicao(t: TalhaoResumo) {
    setEditandoId(t.id);
    setSetorId(t.setor_id);
    setNome(t.nome);
    setArea(t.area_hectares ? String(t.area_hectares) : "");
    setObservacao(t.observacao ?? "");
    setErro("");
    setModalAberto(true);
  }

  async function salvar() {
    if (!setorId || !nome.trim()) {
      setErro("Escolha um setor e digite um nome para o talhao.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const corpo = {
        setor_id: setorId,
        nome: nome.trim(),
        area_hectares: area ? Number(area.replace(",", ".")) : null,
        observacao: observacao.trim() || null,
      };
      const url = editandoId ? `/api/talhoes/${editandoId}` : "/api/talhoes";
      const metodo = editandoId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!res.ok) {
        const data = await res.json();
        setErro(data.error ?? "Erro ao salvar talhao.");
        return;
      }
      setModalAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!editandoId) return;
    const confirmar = window.confirm(`Excluir "${nome}"? Os lancamentos ja feitos permanecem no historico.`);
    if (!confirmar) return;
    try {
      const res = await fetch(`/api/talhoes/${editandoId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.erro("Nao foi possivel excluir o talhao. Tente novamente.");
        return;
      }
      setModalAberto(false);
      carregar();
    } catch {
      toast.erro("Nao foi possivel excluir o talhao. Verifique sua conexao.");
    }
  }

  const grupos = setores
    .map((s) => ({ setor: s, itens: talhoes.filter((t) => t.setor_id === s.id) }))
    .filter((g) => g.itens.length > 0 || setores.length <= 6);

  return (
    <>
      <Header titulo="Talhões" subtitulo="Divida cada setor em pedaços de terra e compare o rendimento" />
      <div className="space-y-5 p-4 pb-24">
        {carregando ? (
          <div className="card animate-pulse text-center text-sm text-neutral-400">Carregando talhões...</div>
        ) : talhoes.length === 0 ? (
          <div className="card text-center">
            <p className="text-sm text-neutral-500">
              Nenhum talhão cadastrado ainda. Divida um setor (ex: Café) em talhões (Talhão 1, Talhão 2...) para
              comparar produção e gastos entre pedaços de terra.
            </p>
            <button className="btn-primary mt-4 w-full" onClick={() => abrirNovo()}>
              + Novo talhão
            </button>
          </div>
        ) : (
          grupos.map(({ setor, itens }) => {
            const areaTotal = itens.reduce((soma, t) => soma + (t.area_hectares ?? 0), 0);
            return (
              <div key={setor.id}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: setor.cor }} />
                    <h2 className="text-sm font-semibold">{setor.nome}</h2>
                    {areaTotal > 0 && (
                      <span className="text-xs text-neutral-400">{formatarNumero(areaTotal)} ha</span>
                    )}
                  </div>
                  <button
                    onClick={() => abrirNovo(setor.id)}
                    className="text-xs font-medium text-brand-600 dark:text-brand-400"
                  >
                    + Talhão
                  </button>
                </div>

                {itens.length === 0 ? (
                  <div className="card text-center text-xs text-neutral-400">Nenhum talhão neste setor ainda.</div>
                ) : (
                  <div className="space-y-2">
                    {itens.map((t) => {
                      const positivo = t.saldo >= 0;
                      return (
                        <button key={t.id} onClick={() => abrirEdicao(t)} className="card block w-full text-left">
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-semibold">{t.nome}</h3>
                            {t.area_hectares != null && (
                              <span className="text-xs text-neutral-400">{formatarNumero(t.area_hectares)} ha</span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-[11px] text-neutral-500">Receitas</p>
                              <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                                {formatarMoeda(t.receitas)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-neutral-500">Despesas</p>
                              <p className="text-sm font-semibold text-danger">{formatarMoeda(t.despesas)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-neutral-500">Saldo</p>
                              <p className={`text-sm font-semibold ${positivo ? "text-brand-600 dark:text-brand-400" : "text-danger"}`}>
                                {formatarMoeda(t.saldo)}
                              </p>
                            </div>
                          </div>
                          {t.producao.length > 0 && (
                            <div className="mt-3 space-y-1 border-t border-neutral-100 pt-2 dark:border-neutral-800">
                              {t.producao.map((p) => (
                                <div key={p.unidade} className="flex items-center justify-between text-xs">
                                  <span className="text-neutral-500">Produção ({p.unidade})</span>
                                  <span className="font-medium">
                                    {formatarNumero(p.total)} {p.unidade}
                                    {p.por_hectare != null && (
                                      <span className="text-neutral-400"> · {formatarNumero(p.por_hectare)}/ha</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {t.lotacao_ua_ha != null && (
                            <div className="mt-3 border-t border-neutral-100 pt-2 text-xs dark:border-neutral-800">
                              <div className="flex items-center justify-between">
                                <span className="text-neutral-500">Lotação</span>
                                <span className="font-medium">{formatarNumero(t.lotacao_ua_ha)} UA/ha</span>
                              </div>
                              {t.qtd_animais_pesados < t.qtd_animais_total && (
                                <p className="mt-0.5 text-[10px] text-neutral-400">
                                  Baseado em {t.qtd_animais_pesados} de {t.qtd_animais_total} animais com peso
                                  registrado
                                </p>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}

        {talhoes.length > 0 && (
          <button className="btn-primary w-full" onClick={() => abrirNovo()}>
            + Novo talhão
          </button>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editandoId ? "Editar talhão" : "Novo talhão"}</h2>
              <button
                onClick={() => setModalAberto(false)}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Setor</label>
                <select
                  className="input-field"
                  value={setorId ?? ""}
                  onChange={(e) => setSetorId(Number(e.target.value))}
                >
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Nome do talhão</label>
                <input
                  className="input-field"
                  placeholder="Ex: Talhão 1, Piquete Norte..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Área (hectares)</label>
                <input
                  className="input-field"
                  placeholder="Ex: 2.5"
                  inputMode="decimal"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Observação (opcional)</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Ex: solo argiloso, plantado em 2019..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>

              {erro && <p className="text-sm text-danger">{erro}</p>}

              <button className="btn-primary w-full" disabled={salvando} onClick={salvar}>
                {salvando ? "Salvando..." : "Salvar talhão"}
              </button>
              {editandoId && (
                <button onClick={excluir} className="w-full rounded-xl border border-danger py-3 text-sm font-medium text-danger">
                  Excluir talhão
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
