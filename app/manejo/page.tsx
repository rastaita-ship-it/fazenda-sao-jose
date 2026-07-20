"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface Setor {
  id: number;
  nome: string;
  tipo: string;
  cor: string;
}

interface Funcionario {
  id: number;
  nome: string;
}

interface Manejo {
  id: number;
  setor_id: number;
  setor_nome: string;
  setor_cor: string;
  atividade_nome: string;
  data_planejada: string;
  data_realizada: string | null;
  status: string;
  observacao: string | null;
  funcionario_id: number | null;
  funcionario_nome: string | null;
  grupo_id: string;
}

interface AtividadePadrao {
  id: number;
  setor_tipo: string;
  nome: string;
  mes_sugerido: number | null;
}

interface GrupoAtividade {
  grupo_id: string;
  atividade_nome: string;
  funcionario_id: number | null;
  funcionario_nome: string | null;
  itens: Manejo[];
}

const MESES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  concluido: "Concluido",
  alterado: "Alterado",
  cancelado: "Cancelado",
};

const STATUS_STYLE: Record<string, string> = {
  planejado: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  concluido: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  alterado: "bg-warning/10 text-warning",
  cancelado: "bg-red-100 text-danger dark:bg-red-900/20",
};

function mesAtual() {
  return new Date().getMonth() + 1;
}

function anoAtual() {
  return new Date().getFullYear();
}

function formatarData(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

function IconeLapis() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  );
}

function IconeLixo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"></path>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  );
}

function agruparPorGrupoId(lista: Manejo[]): GrupoAtividade[] {
  const mapa = new Map<string, GrupoAtividade>();
  for (const m of lista) {
    const existente = mapa.get(m.grupo_id);
    if (existente) {
      existente.itens.push(m);
    } else {
      mapa.set(m.grupo_id, {
        grupo_id: m.grupo_id,
        atividade_nome: m.atividade_nome,
        funcionario_id: m.funcionario_id,
        funcionario_nome: m.funcionario_nome,
        itens: [m],
      });
    }
  }
  const grupos = Array.from(mapa.values());
  for (const g of grupos) {
    g.itens.sort((a, b) => a.data_planejada.localeCompare(b.data_planejada));
  }
  grupos.sort((a, b) => a.itens[0].data_planejada.localeCompare(b.itens[0].data_planejada));
  return grupos;
}

export default function ManejoPage() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [setorSelecionado, setSetorSelecionado] = useState<number | null>(null);
  const [mes, setMes] = useState(mesAtual());
  const [manejos, setManejos] = useState<Manejo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [atividadesPadrao, setAtividadesPadrao] = useState<AtividadePadrao[]>([]);
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());

  const [mostrarForm, setMostrarForm] = useState(false);
  const [atividadeEscolhida, setAtividadeEscolhida] = useState("");
  const [atividadeCustom, setAtividadeCustom] = useState("");
  const [dataInicioNovo, setDataInicioNovo] = useState("");
  const [dataFimNovo, setDataFimNovo] = useState("");
  const [responsavelId, setResponsavelId] = useState<number | "">("");

  const [editandoGrupoId, setEditandoGrupoId] = useState<string | null>(null);
  const [editAtividade, setEditAtividade] = useState("");
  const [editDataInicio, setEditDataInicio] = useState("");
  const [editDataFim, setEditDataFim] = useState("");
  const [editResponsavelId, setEditResponsavelId] = useState<number | "">("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoGrupoId, setExcluindoGrupoId] = useState<string | null>(null);

  function alternarGrupo(chave: string) {
    setGruposAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) {
        novo.delete(chave);
      } else {
        novo.add(chave);
      }
      return novo;
    });
  }

  useEffect(() => {
    fetch("/api/sectors")
      .then((r) => r.json())
      .then((lista: Setor[]) => {
        setSetores(lista);
        if (lista.length > 0) setSetorSelecionado(lista[0].id);
      });
    fetch("/api/employees")
      .then((r) => r.json())
      .then(setFuncionarios);
  }, []);

  function carregarManejos() {
    if (!setorSelecionado) return;
    setCarregando(true);
    const ano = anoAtual();
    const from = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const to = `${ano}-${String(mes).padStart(2, "0")}-31`;
    fetch(`/api/manejos?setor_id=${setorSelecionado}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setManejos)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarManejos();
  }, [setorSelecionado, mes]);

  const setorAtual = setores.find((s) => s.id === setorSelecionado);

  useEffect(() => {
    if (!setorAtual) return;
    fetch(`/api/activity-templates?setor_tipo=${setorAtual.tipo}`)
      .then((r) => r.json())
      .then(setAtividadesPadrao);
  }, [setorAtual]);

  async function marcarConcluido(id: number) {
    const hoje = new Date().toISOString().slice(0, 10);
    await fetch(`/api/manejos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "concluido", data_realizada: hoje }),
    });
    carregarManejos();
  }

  async function criarManejo() {
    const nomeAtividade = atividadeEscolhida === "outra" ? atividadeCustom : atividadeEscolhida;
    if (!setorSelecionado || !nomeAtividade || !dataInicioNovo) return;

    await fetch("/api/manejos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setor_id: setorSelecionado,
        atividade_nome: nomeAtividade,
        data_inicio: dataInicioNovo,
        data_fim: dataFimNovo || null,
        funcionario_id: responsavelId || null,
        origem: atividadeEscolhida === "outra" ? "avulso" : "padrao",
      }),
    });

    setAtividadeEscolhida("");
    setAtividadeCustom("");
    setDataInicioNovo("");
    setDataFimNovo("");
    setResponsavelId("");
    setMostrarForm(false);
    carregarManejos();
  }

  function abrirEdicaoGrupo(g: GrupoAtividade) {
    setEditandoGrupoId(g.grupo_id);
    setEditAtividade(g.atividade_nome);
    setEditDataInicio(g.itens[0].data_planejada);
    setEditDataFim(g.itens[g.itens.length - 1].data_planejada);
    setEditResponsavelId(g.funcionario_id ?? "");
  }

  async function salvarEdicaoGrupo() {
    if (!editandoGrupoId) return;
    setSalvandoEdicao(true);
    try {
      await fetch(`/api/manejo-grupos/${editandoGrupoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atividade_nome: editAtividade,
          funcionario_id: editResponsavelId || null,
          data_inicio: editDataInicio,
          data_fim: editDataFim || editDataInicio,
        }),
      });
      setEditandoGrupoId(null);
      carregarManejos();
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function excluirGrupo(grupoId: string, nome: string) {
    const confirmar = window.confirm(`Excluir a atividade "${nome}" (todos os dias)? Essa acao nao pode ser desfeita.`);
    if (!confirmar) return;
    setExcluindoGrupoId(grupoId);
    try {
      await fetch(`/api/manejo-grupos/${grupoId}`, { method: "DELETE" });
      carregarManejos();
    } finally {
      setExcluindoGrupoId(null);
    }
  }

  const grupos = agruparPorGrupoId(manejos);

  return (
    <>
      <Header titulo="Calendario de Manejo" subtitulo="Atividades planejadas e realizadas" />
      <div className="space-y-4 p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {setores.map((s) => (
            <button
              key={s.id}
              onClick={() => setSetorSelecionado(s.id)}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                setorSelecionado === s.id
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              {s.nome}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setMes((m) => (m === 1 ? 12 : m - 1))}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {"<"}
          </button>
          <span className="text-sm font-semibold">{MESES[mes - 1]}</span>
          <button
            onClick={() => setMes((m) => (m === 12 ? 1 : m + 1))}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {">"}
          </button>
        </div>

        <a
          href="/manejo/calendario"
          className="block w-full rounded-2xl border border-neutral-300 py-3 text-center text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
        >
          Ver calendario visual
        </a>

        <button className="btn-primary w-full" onClick={() => setMostrarForm(true)}>
          + Adicionar atividade
        </button>

        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Carregando...</div>
        )}

        {!carregando && grupos.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">
            Nenhuma atividade neste mes.
          </div>
        )}

        <div className="space-y-2">
          {grupos.map((g) => {
            const aberto = gruposAbertos.has(g.grupo_id);
            const total = g.itens.length;
            const concluidos = g.itens.filter((i) => i.status === "concluido").length;
            const pct = Math.round((concluidos / total) * 100);
            const inicio = formatarData(g.itens[0].data_planejada);
            const fim = formatarData(g.itens[total - 1].data_planejada);

            return (
              <div key={g.grupo_id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => alternarGrupo(g.grupo_id)}
                    className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{g.atividade_nome}</p>
                      <p className="text-xs text-neutral-500">
                        {total > 1 ? `${inicio} ate ${fim} - ${total} dias` : inicio}
                      </p>
                      {g.funcionario_nome && (
                        <p className="text-xs text-neutral-500">Responsavel: {g.funcionario_nome}</p>
                      )}
                    </div>
                    {total > 1 && (
                      <span className="flex-shrink-0 text-xs font-medium text-brand-600 dark:text-brand-400">
                        {concluidos}/{total}
                      </span>
                    )}
                  </button>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => abrirEdicaoGrupo(g)}
                      aria-label="Editar atividade"
                      className="rounded-xl p-2 text-neutral-400 active:bg-brand-500/10 active:text-brand-600"
                    >
                      <IconeLapis />
                    </button>
                    <button
                      onClick={() => excluirGrupo(g.grupo_id, g.atividade_nome)}
                      disabled={excluindoGrupoId === g.grupo_id}
                      aria-label="Excluir atividade"
                      className="rounded-xl p-2 text-neutral-400 active:bg-danger/10 active:text-danger disabled:opacity-40"
                    >
                      <IconeLixo />
                    </button>
                  </div>
                </div>

                {total > 1 && (
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                )}

                {total === 1 && g.itens[0].status === "planejado" && (
                  <button
                    onClick={() => marcarConcluido(g.itens[0].id)}
                    className="mt-2 w-full rounded-xl border border-brand-600 py-2 text-sm font-medium text-brand-600 dark:text-brand-400"
                  >
                    Marcar como concluido
                  </button>
                )}

                {total > 1 && aberto && (
                  <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    {g.itens.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">{formatarData(m.data_planejada)}</p>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[m.status]}`}
                          >
                            {STATUS_LABEL[m.status]}
                          </span>
                        </div>
                        {m.status === "planejado" && (
                          <button
                            onClick={() => marcarConcluido(m.id)}
                            className="rounded-xl border border-brand-600 px-2 py-1 text-[11px] font-medium text-brand-600 dark:text-brand-400"
                          >
                            Concluir
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Nova atividade</h2>
              <button
                onClick={() => setMostrarForm(false)}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Atividade
                </label>
                <select
                  className="input-field"
                  value={atividadeEscolhida}
                  onChange={(e) => setAtividadeEscolhida(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {atividadesPadrao.map((a) => (
                    <option key={a.id} value={a.nome}>
                      {a.nome}
                    </option>
                  ))}
                  <option value="outra">Outra atividade (digitar)</option>
                </select>
              </div>

              {atividadeEscolhida === "outra" && (
                <input
                  className="input-field"
                  placeholder="Nome da atividade"
                  value={atividadeCustom}
                  onChange={(e) => setAtividadeCustom(e.target.value)}
                />
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Data inicio
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={dataInicioNovo}
                  onChange={(e) => setDataInicioNovo(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Data fim (opcional, para atividades de varios dias)
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={dataFimNovo}
                  onChange={(e) => setDataFimNovo(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Funcionario responsavel
                </label>
                <select
                  className="input-field"
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(Number(e.target.value))}
                >
                  <option value="">Nao atribuido ainda</option>
                  {funcionarios.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn-primary w-full" onClick={criarManejo}>
                Salvar atividade
              </button>
            </div>
          </div>
        </div>
      )}

      {editandoGrupoId && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Editar atividade</h2>
              <button
                onClick={() => setEditandoGrupoId(null)}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Atividade
                </label>
                <input
                  className="input-field"
                  value={editAtividade}
                  onChange={(e) => setEditAtividade(e.target.value)}
                />
              </div>

              <p className="text-xs text-neutral-400">
                Ajuste as datas abaixo: dias que saem do periodo sao removidos (se ainda nao
                concluidos), e dias novos sao adicionados automaticamente.
              </p>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Data inicio
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={editDataInicio}
                  onChange={(e) => setEditDataInicio(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Data fim
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={editDataFim}
                  onChange={(e) => setEditDataFim(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Funcionario responsavel
                </label>
                <select
                  className="input-field"
                  value={editResponsavelId}
                  onChange={(e) => setEditResponsavelId(Number(e.target.value))}
                >
                  <option value="">Nao atribuido</option>
                  {funcionarios.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn-primary w-full"
                disabled={salvandoEdicao}
                onClick={salvarEdicaoGrupo}
              >
                {salvandoEdicao ? "Salvando..." : "Salvar alteracoes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
