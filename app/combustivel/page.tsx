"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { useToast } from "@/components/ui/ToastContext";

interface Maquina {
  id: number;
  nome: string;
  tipo: string;
  identificador: string | null;
  horimetro_km_atual: number | null;
  status: string;
}

interface Abastecimento {
  id: number;
  patrimonio_id: number;
  data: string;
  litros: number;
  valor_total: number | null;
  preco_litro: number | null;
  horimetro_km: number | null;
  local: string | null;
  observacao: string | null;
}

const UNIDADE_POR_TIPO: Record<string, string> = { trator: "h", maquina: "h", veiculo: "km" };

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatarData(data: string) {
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
}
function unidadeDaMaquina(tipo: string) {
  return UNIDADE_POR_TIPO[tipo] ?? "un";
}

export default function CombustivelPage() {
  const toast = useToast();
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [carregandoMaquinas, setCarregandoMaquinas] = useState(true);
  const [maquinaId, setMaquinaId] = useState<number | null>(null);

  const [historico, setHistorico] = useState<Abastecimento[]>([]);
  const [mediaPreco, setMediaPreco] = useState<number | null>(null);
  const [mediaConsumo, setMediaConsumo] = useState<number | null>(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [litros, setLitros] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [horimetroKm, setHorimetroKm] = useState("");
  const [local, setLocal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [criarLancamento, setCriarLancamento] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/patrimonio")
      .then((r) => r.json())
      .then((itens: Maquina[]) =>
        setMaquinas(itens.filter((i) => ["trator", "maquina", "veiculo"].includes(i.tipo) && i.status === "ativo"))
      )
      .finally(() => setCarregandoMaquinas(false));
  }, []);

  function carregarHistorico(id: number) {
    setCarregandoHistorico(true);
    fetch(`/api/abastecimentos?patrimonio_id=${id}`)
      .then((r) => r.json())
      .then((dados) => {
        setHistorico(dados.itens);
        setMediaPreco(dados.media_preco_litro);
        setMediaConsumo(dados.media_consumo);
      })
      .finally(() => setCarregandoHistorico(false));
  }

  function selecionarMaquina(m: Maquina) {
    setMaquinaId(m.id);
    carregarHistorico(m.id);
  }

  function abrirAbastecer() {
    const maquina = maquinas.find((m) => m.id === maquinaId);
    setData(new Date().toISOString().slice(0, 10));
    setLitros("");
    setValorTotal("");
    setHorimetroKm(maquina?.horimetro_km_atual != null ? String(maquina.horimetro_km_atual) : "");
    setLocal("");
    setObservacao("");
    setCriarLancamento(true);
    setErro("");
    setAvisos([]);
    setModalAberto(true);
  }

  async function salvar() {
    if (!maquinaId || !litros) {
      setErro("Informe a quantidade de litros.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/abastecimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patrimonio_id: maquinaId,
          data,
          litros: Number(litros.replace(",", ".")),
          valor_total: valorTotal ? Number(valorTotal.replace(",", ".")) : null,
          horimetro_km: horimetroKm ? Number(horimetroKm.replace(",", ".")) : null,
          local: local.trim() || null,
          observacao: observacao.trim() || null,
          criar_lancamento: criarLancamento,
        }),
      });
      if (!res.ok) {
        const dados = await res.json();
        setErro(dados.error ?? "Erro ao registrar abastecimento.");
        return;
      }
      const dados = await res.json();
      if (dados.alertas?.length) {
        setAvisos(dados.alertas);
      } else {
        setModalAberto(false);
      }
      carregarHistorico(maquinaId);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: number) {
    if (!maquinaId) return;
    if (!window.confirm("Excluir este abastecimento? Se ele gerou uma despesa no fluxo de caixa, ela tambem sera removida.")) return;
    try {
      const res = await fetch(`/api/abastecimentos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.erro("Nao foi possivel excluir o abastecimento. Tente novamente.");
        return;
      }
      carregarHistorico(maquinaId);
    } catch {
      toast.erro("Nao foi possivel excluir o abastecimento. Verifique sua conexao.");
    }
  }

  const maquinaAtual = maquinas.find((m) => m.id === maquinaId);

  if (maquinaId && maquinaAtual) {
    const unidade = unidadeDaMaquina(maquinaAtual.tipo);
    return (
      <>
        <Header titulo={maquinaAtual.nome} subtitulo="Historico de abastecimento" />
        <div className="space-y-4 p-4 pb-24">
          <button onClick={() => setMaquinaId(null)} className="text-sm font-medium text-brand-600 dark:text-brand-400">
            ← Trocar de máquina
          </button>

          <div className="card grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-[11px] text-neutral-500">Preço médio</p>
              <p className="text-sm font-semibold">{mediaPreco != null ? `${formatarMoeda(mediaPreco)}/L` : "—"}</p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500">Consumo médio</p>
              <p className="text-sm font-semibold">{mediaConsumo != null ? `${mediaConsumo.toFixed(2)} ${unidade}/L` : "—"}</p>
            </div>
          </div>

          <button className="btn-primary w-full" onClick={abrirAbastecer}>
            + Registrar abastecimento
          </button>

          {carregandoHistorico ? (
            <div className="card animate-pulse text-center text-sm text-neutral-400">Carregando...</div>
          ) : historico.length === 0 ? (
            <div className="card text-center text-sm text-neutral-400">Nenhum abastecimento registrado ainda.</div>
          ) : (
            <div className="space-y-2">
              {historico.map((a) => (
                <div key={a.id} className="card flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {a.litros} L{a.valor_total != null ? ` · ${formatarMoeda(a.valor_total)}` : ""}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatarData(a.data)}
                      {a.horimetro_km != null ? ` · ${a.horimetro_km} ${unidade}` : ""}
                      {a.local ? ` · ${a.local}` : ""}
                    </p>
                  </div>
                  <button onClick={() => excluir(a.id)} className="flex-shrink-0 text-xs font-medium text-danger">
                    excluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
            <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Registrar abastecimento</h2>
                <button onClick={() => setModalAberto(false)} className="text-2xl leading-none text-neutral-400" aria-label="Fechar">
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {avisos.length > 0 && (
                  <div className="rounded-2xl border border-warning bg-warning/10 p-3 space-y-1">
                    {avisos.map((a, i) => (
                      <p key={i} className="text-xs text-warning">
                        ⚠️ {a}
                      </p>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Litros</label>
                    <input className="input-field" inputMode="decimal" value={litros} onChange={(e) => setLitros(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">Valor total (R$)</label>
                    <input className="input-field" inputMode="decimal" placeholder="0,00" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Data</label>
                  <input type="date" className="input-field" value={data} onChange={(e) => setData(e.target.value)} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    {unidade === "km" ? "Odômetro atual (km)" : "Horímetro atual (h)"}
                  </label>
                  <input className="input-field" inputMode="decimal" value={horimetroKm} onChange={(e) => setHorimetroKm(e.target.value)} />
                </div>

                <input className="input-field" placeholder="Local (opcional)" value={local} onChange={(e) => setLocal(e.target.value)} />
                <input className="input-field" placeholder="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={criarLancamento} onChange={(e) => setCriarLancamento(e.target.checked)} />
                  Lançar como despesa no fluxo de caixa
                </label>

                {erro && <p className="text-sm text-danger">{erro}</p>}

                <button className="btn-primary w-full" disabled={salvando} onClick={salvar}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                {avisos.length > 0 && (
                  <button onClick={() => setModalAberto(false)} className="w-full text-center text-xs font-medium text-neutral-500">
                    Fechar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Header titulo="Combustível" subtitulo="Escolha a máquina para ver o histórico" />
      <div className="space-y-2 p-4">
        {carregandoMaquinas ? (
          <div className="card animate-pulse text-center text-sm text-neutral-400">Carregando máquinas...</div>
        ) : maquinas.length === 0 ? (
          <div className="card text-center text-sm text-neutral-400">
            Nenhum trator, máquina ou veículo cadastrado em Patrimônio ainda.
          </div>
        ) : (
          maquinas.map((m) => (
            <button key={m.id} onClick={() => selecionarMaquina(m)} className="card flex w-full items-center justify-between text-left">
              <div>
                <p className="text-sm font-semibold">{m.nome}</p>
                {m.identificador && <p className="text-xs text-neutral-500">{m.identificador}</p>}
              </div>
              {m.horimetro_km_atual != null && (
                <span className="text-xs text-neutral-400">
                  {m.horimetro_km_atual} {unidadeDaMaquina(m.tipo)}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </>
  );
}
