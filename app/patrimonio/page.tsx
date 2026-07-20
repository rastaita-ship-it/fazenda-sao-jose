"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface Patrimonio {
  id: number;
  nome: string;
  tipo: string;
  identificador: string | null;
  data_aquisicao: string | null;
  valor_aquisicao: number | null;
  vida_util_meses: number | null;
  horimetro_km_atual: number | null;
  status: string;
  observacao: string | null;
  foto_url: string | null;
  manual_url: string | null;
}

const TIPOS: { valor: string; rotulo: string }[] = [
  { valor: "trator", rotulo: "Trator" },
  { valor: "maquina", rotulo: "Maquina" },
  { valor: "ferramenta", rotulo: "Ferramenta" },
  { valor: "veiculo", rotulo: "Veiculo" },
  { valor: "instalacao", rotulo: "Instalacao" },
  { valor: "area_cultivo", rotulo: "Area de cultivo" },
  { valor: "pasto", rotulo: "Pasto" },
  { valor: "outro", rotulo: "Outro" },
];

interface PadraoTipo {
  meses: number;
  usoMax?: number;
  unidadeUso?: string;
  fonte: string;
}

const PADROES_POR_TIPO: Record<string, PadraoTipo> = {
  trator: { meses: 120, usoMax: 15000, unidadeUso: "horas", fonte: "CONAB: 10 anos ou 15.000h" },
  maquina: { meses: 120, usoMax: 12000, unidadeUso: "horas", fonte: "Receita Federal: 10 anos" },
  veiculo: { meses: 60, usoMax: 200000, unidadeUso: "km", fonte: "Receita Federal: 5 anos" },
  ferramenta: { meses: 60, fonte: "Estimativa de mercado: 5 anos" },
  instalacao: { meses: 300, fonte: "Receita Federal: 25 anos" },
};

function rotuloTipo(tipo: string) {
  return TIPOS.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcularVidaUtil(
  dataAquisicao: string | null,
  vidaUtilMeses: number | null,
  tipo?: string,
  horimetroAtual?: number | null
) {
  if (!dataAquisicao || !vidaUtilMeses) return null;
  const inicio = new Date(dataAquisicao + "T12:00:00");
  const hoje = new Date();
  const mesesPassados =
    (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth());
  const pctTempo = Math.min(100, Math.max(0, Math.round((mesesPassados / vidaUtilMeses) * 100)));

  let pctUso: number | null = null;
  const padrao = tipo ? PADROES_POR_TIPO[tipo] : undefined;
  if (padrao?.usoMax && horimetroAtual) {
    pctUso = Math.min(100, Math.max(0, Math.round((horimetroAtual / padrao.usoMax) * 100)));
  }

  const pct = pctUso !== null ? Math.max(pctTempo, pctUso) : pctTempo;
  const limitante = pctUso !== null && pctUso > pctTempo ? "uso" : "tempo";
  const mesesRestantes = vidaUtilMeses - mesesPassados;
  return { pct, mesesRestantes, limitante, pctUso };
}

function corVidaUtil(pct: number) {
  if (pct >= 90) return "bg-danger";
  if (pct >= 70) return "bg-warning";
  return "bg-brand-500";
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

export default function PatrimonioPage() {
  const [itens, setItens] = useState<Patrimonio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("trator");
  const [identificador, setIdentificador] = useState("");
  const [dataAquisicao, setDataAquisicao] = useState("");
  const [valorAquisicao, setValorAquisicao] = useState("");
  const [vidaUtilMeses, setVidaUtilMeses] = useState("");
  const [horimetro, setHorimetro] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviandoManual, setEnviandoManual] = useState(false);
  const [manualLink, setManualLink] = useState("");
  const [salvandoLink, setSalvandoLink] = useState(false);
  const [itemEditando, setItemEditando] = useState<Patrimonio | null>(null);

  function carregar() {
    setCarregando(true);
    fetch("/api/patrimonio")
      .then((r) => r.json())
      .then(setItens)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  function aoTrocarTipo(novoTipo: string) {
    setTipo(novoTipo);
    const padrao = PADROES_POR_TIPO[novoTipo];
    if (padrao && !vidaUtilMeses) {
      setVidaUtilMeses(String(padrao.meses));
    }
  }

  function limparForm() {
    setNome("");
    setTipo("trator");
    setIdentificador("");
    setDataAquisicao("");
    setValorAquisicao("");
    setVidaUtilMeses("");
    setHorimetro("");
    setObservacao("");
    setEditandoId(null);
    setItemEditando(null);
    setManualLink("");
  }

  function abrirNovo() {
    limparForm();
    setMostrarForm(true);
  }

  function abrirEdicao(item: Patrimonio) {
    setEditandoId(item.id);
    setItemEditando(item);
    setNome(item.nome);
    setTipo(item.tipo);
    setIdentificador(item.identificador ?? "");
    setDataAquisicao(item.data_aquisicao ?? "");
    setValorAquisicao(item.valor_aquisicao ? String(item.valor_aquisicao) : "");
    setVidaUtilMeses(item.vida_util_meses ? String(item.vida_util_meses) : "");
    setHorimetro(item.horimetro_km_atual ? String(item.horimetro_km_atual) : "");
    setObservacao(item.observacao ?? "");
    setManualLink(item.manual_url && item.manual_url.startsWith("http") ? item.manual_url : "");
    setMostrarForm(true);
  }

  async function enviarArquivo(tipoCampo: "foto" | "manual", arquivo: File) {
    if (!editandoId) return;
    if (tipoCampo === "foto") setEnviandoFoto(true);
    else setEnviandoManual(true);

    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("patrimonio_id", String(editandoId));
    formData.append("tipo_campo", tipoCampo);

    try {
      const res = await fetch("/api/patrimonio/upload", { method: "POST", body: formData });
      if (res.ok) {
        const atualizados = await fetch("/api/patrimonio").then((r) => r.json());
        setItens(atualizados);
        const atualizado = atualizados.find((i: Patrimonio) => i.id === editandoId);
        if (atualizado) setItemEditando(atualizado);
      }
    } finally {
      if (tipoCampo === "foto") setEnviandoFoto(false);
      else setEnviandoManual(false);
    }
  }

  async function salvarLinkManual() {
    if (!editandoId || !manualLink.trim()) return;
    setSalvandoLink(true);
    try {
      await fetch(`/api/patrimonio/${editandoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual_url: manualLink.trim() }),
      });
      const atualizados = await fetch("/api/patrimonio").then((r) => r.json());
      setItens(atualizados);
      const atualizado = atualizados.find((i: Patrimonio) => i.id === editandoId);
      if (atualizado) setItemEditando(atualizado);
    } finally {
      setSalvandoLink(false);
    }
  }

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    const corpo = {
      nome: nome.trim(),
      tipo,
      identificador: identificador.trim() || null,
      data_aquisicao: dataAquisicao || null,
      valor_aquisicao: valorAquisicao ? Number(valorAquisicao.replace(",", ".")) : null,
      vida_util_meses: vidaUtilMeses ? Number(vidaUtilMeses) : null,
      horimetro_km_atual: horimetro ? Number(horimetro.replace(",", ".")) : null,
      observacao: observacao.trim() || null,
    };
    try {
      if (editandoId) {
        await fetch(`/api/patrimonio/${editandoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        });
        setMostrarForm(false);
        limparForm();
        carregar();
      } else {
        const res = await fetch("/api/patrimonio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        });
        const novo = await res.json();
        setEditandoId(novo.id);
        setItemEditando(novo);
        carregar();
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: number, nomeItem: string) {
    const confirmar = window.confirm(`Remover "${nomeItem}" do inventario?`);
    if (!confirmar) return;
    await fetch(`/api/patrimonio/${id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <>
      <Header titulo="Patrimonio" subtitulo="Maquinas, equipamentos e areas" />
      <div className="space-y-3 p-4">
        {!carregando && itens.length > 0 && (
          <div className="card text-center">
            <p className="text-sm text-neutral-500">Valor total do patrimonio</p>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
              {formatarMoeda(itens.reduce((soma, item) => soma + (item.valor_aquisicao ?? 0), 0))}
            </p>
            <p className="text-xs text-neutral-400">{itens.length} itens cadastrados</p>
          </div>
        )}

        <button className="btn-primary w-full" onClick={abrirNovo}>
          + Adicionar item
        </button>

        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Carregando...</div>
        )}

        {!carregando && itens.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">
            Nenhum item cadastrado ainda.
          </div>
        )}

        {itens.map((item) => {
          const vida = calcularVidaUtil(
            item.data_aquisicao,
            item.vida_util_meses,
            item.tipo,
            item.horimetro_km_atual
          );
          return (
            <div key={item.id} className="card">
              <div className="flex items-start justify-between gap-2">
                {item.foto_url && (
                  <img
                    src={item.foto_url}
                    alt={item.nome}
                    className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.nome}</p>
                  <p className="text-xs text-neutral-500">
                    {rotuloTipo(item.tipo)}
                    {item.identificador && <> - {item.identificador}</>}
                  </p>
                  {item.valor_aquisicao != null && (
                    <p className="text-xs text-neutral-400">
                      Valor: {formatarMoeda(item.valor_aquisicao)}
                    </p>
                  )}
                  {item.manual_url && (
                    <a
                      href={item.manual_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-brand-600 dark:text-brand-400"
                    >
                      Ver manual
                    </a>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => abrirEdicao(item)}
                    aria-label="Editar item"
                    className="rounded-xl p-2 text-neutral-400 active:bg-brand-500/10 active:text-brand-600"
                  >
                    <IconeLapis />
                  </button>
                  <button
                    onClick={() => excluir(item.id, item.nome)}
                    aria-label="Remover item"
                    className="rounded-xl p-2 text-neutral-400 active:bg-danger/10 active:text-danger"
                  >
                    <IconeLixo />
                  </button>
                </div>
              </div>

              {vida && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>
                      Vida util {vida.limitante === "uso" ? "(por uso)" : "(por tempo)"}
                    </span>
                    <span>
                      {vida.mesesRestantes > 0
                        ? `${vida.mesesRestantes} meses restantes`
                        : "Vida util esgotada"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className={`h-full ${corVidaUtil(vida.pct)}`}
                      style={{ width: `${vida.pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editandoId ? "Editar item" : "Novo item"}
              </h2>
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
                placeholder="Nome (ex: Trator Massey 4275)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />

              <select className="input-field" value={tipo} onChange={(e) => aoTrocarTipo(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </select>

              <input
                className="input-field"
                placeholder="Identificador (placa, serie, opcional)"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
              />

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Data de aquisicao
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={dataAquisicao}
                  onChange={(e) => setDataAquisicao(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Valor (R$)
                  </label>
                  <input
                    className="input-field"
                    inputMode="decimal"
                    value={valorAquisicao}
                    onChange={(e) => setValorAquisicao(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Vida util (meses)
                  </label>
                  <input
                    className="input-field"
                    inputMode="numeric"
                    value={vidaUtilMeses}
                    onChange={(e) => setVidaUtilMeses(e.target.value)}
                  />
                  {PADROES_POR_TIPO[tipo] && (
                    <p className="mt-1 text-[11px] text-neutral-400">
                      Padrao: {PADROES_POR_TIPO[tipo].fonte}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Horimetro / km atual (opcional)
                </label>
                <input
                  className="input-field"
                  inputMode="decimal"
                  value={horimetro}
                  onChange={(e) => setHorimetro(e.target.value)}
                />
              </div>

              <input
                className="input-field"
                placeholder="Observacao (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />

              {editandoId && (
                <div className="space-y-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-700">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Foto do item
                    </label>
                    {itemEditando?.foto_url && (
                      <img
                        src={itemEditando.foto_url}
                        alt="Foto do item"
                        className="mb-2 h-24 w-24 rounded-xl object-cover"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={enviandoFoto}
                      onChange={(e) => {
                        const arquivo = e.target.files?.[0];
                        if (arquivo) enviarArquivo("foto", arquivo);
                      }}
                      className="block w-full text-xs text-neutral-500"
                    />
                    {enviandoFoto && <p className="mt-1 text-xs text-neutral-400">Enviando foto...</p>}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Manual (PDF ou link)
                    </label>
                    {itemEditando?.manual_url && (
                      <a
                        href={itemEditando.manual_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-2 block text-xs font-medium text-brand-600 dark:text-brand-400"
                      >
                        Ver manual atual
                      </a>
                    )}
                    <input
                      type="file"
                      accept="application/pdf"
                      disabled={enviandoManual}
                      onChange={(e) => {
                        const arquivo = e.target.files?.[0];
                        if (arquivo) enviarArquivo("manual", arquivo);
                      }}
                      className="mb-2 block w-full text-xs text-neutral-500"
                    />
                    {enviandoManual && <p className="text-xs text-neutral-400">Enviando manual...</p>}
                    <div className="flex gap-2">
                      <input
                        className="input-field"
                        placeholder="Ou cole o link do manual"
                        value={manualLink}
                        onChange={(e) => setManualLink(e.target.value)}
                      />
                      <button
                        onClick={salvarLinkManual}
                        disabled={salvandoLink || !manualLink.trim()}
                        className="flex-shrink-0 rounded-xl border border-brand-600 px-3 text-sm font-medium text-brand-600 disabled:opacity-40 dark:text-brand-400"
                      >
                        {salvandoLink ? "..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button className="btn-primary w-full" disabled={salvando} onClick={salvar}>
                {salvando ? "Salvando..." : editandoId ? "Salvar dados" : "Salvar e continuar"}
              </button>
              {editandoId && (
                <button
                  className="w-full rounded-xl border border-neutral-300 py-3 text-sm font-medium text-neutral-500 dark:border-neutral-700"
                  onClick={() => {
                    setMostrarForm(false);
                    limparForm();
                    carregar();
                  }}
                >
                  Concluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
