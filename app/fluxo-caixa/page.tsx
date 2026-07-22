"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { TransacaoComSetor, Setor } from "@/lib/types";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_STYLES: Record<string, string> = {
  pago: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  pendente: "bg-warning/10 text-warning",
  previsto: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
};

export default function FluxoCaixaPage() {
  const [transacoes, setTransacoes] = useState<TransacaoComSetor[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [editSetorId, setEditSetorId] = useState<number | "">("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editData, setEditData] = useState("");
  const [editStatus, setEditStatus] = useState("pago");
  const [editRecibo, setEditRecibo] = useState<string | null>(null);
  const [enviandoRecibo, setEnviandoRecibo] = useState(false);

  function carregar() {
    setCarregando(true);
    fetch("/api/transactions")
      .then((r) => r.json())
      .then(setTransacoes)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    fetch("/api/sectors").then((r) => r.json()).then(setSetores);
  }, []);

  async function excluir(id: number, descricao: string) {
    const confirmar = window.confirm(
      `Excluir o lancamento "${descricao}"? Essa acao nao pode ser desfeita.`
    );
    if (!confirmar) return;

    setExcluindoId(id);
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      setTransacoes((atual) => atual.filter((t) => t.id !== id));
    } finally {
      setExcluindoId(null);
    }
  }

  function abrirEdicao(t: TransacaoComSetor) {
    setEditandoId(t.id);
    setEditSetorId(t.setor_id);
    setEditDescricao(t.descricao);
    setEditValor(String(t.valor));
    setEditData(t.data);
    setEditStatus(t.status);
    setEditRecibo(t.recibo_url);
  }

  async function enviarRecibo(arquivo: File) {
    if (!editandoId) return;
    setEnviandoRecibo(true);
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("transacao_id", String(editandoId));
    try {
      const res = await fetch("/api/transactions/upload", { method: "POST", body: formData });
      if (res.ok) {
        const dados = await res.json();
        setEditRecibo(dados.url);
        carregar();
      }
    } finally {
      setEnviandoRecibo(false);
    }
  }

  async function salvarEdicao() {
    if (!editandoId) return;
    setSalvandoEdicao(true);
    try {
      await fetch(`/api/transactions/${editandoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setor_id: editSetorId,
          descricao: editDescricao,
          valor: Number(String(editValor).replace(",", ".")),
          data: editData,
          status: editStatus,
        }),
      });
      setEditandoId(null);
      carregar();
    } finally {
      setSalvandoEdicao(false);
    }
  }

  return (
    <>
      <Header titulo="Fluxo de Caixa" subtitulo="Ultimos lancamentos" />
      <div className="space-y-2 p-4">
        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Carregando...</div>
        )}
        {!carregando && transacoes.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">
            Nenhum lancamento ainda. Use os botoes de Receita/Despesa no Resumo.
          </div>
        )}
        {transacoes.map((t) => (
          <div key={t.id} className="card flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: t.setor_cor }}
                />
                <p className="truncate text-sm font-medium">{t.descricao}</p>
              </div>
              <p className="text-xs text-neutral-500">
                {t.setor_nome} - {new Date(t.data).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p
                className={`text-sm font-semibold ${
                  t.tipo === "receita" ? "text-brand-600 dark:text-brand-400" : "text-danger"
                }`}
              >
                {t.tipo === "receita" ? "+" : "-"}
                {formatarMoeda(t.valor)}
              </p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[t.status]}`}
              >
                {t.status}
              </span>
            </div>
            <button
              onClick={() => abrirEdicao(t)}
              aria-label="Editar lancamento"
              className="flex-shrink-0 rounded-xl p-2.5 text-neutral-400 active:bg-brand-500/10 active:text-brand-600"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button
              onClick={() => excluir(t.id, t.descricao)}
              disabled={excluindoId === t.id}
              aria-label="Excluir lancamento"
              className="flex-shrink-0 rounded-xl p-2.5 text-neutral-400 active:bg-danger/10 active:text-danger disabled:opacity-40"
            >
              {excluindoId === t.id ? (
                "..."
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>

      {editandoId && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Editar lancamento</h2>
              <button
                onClick={() => setEditandoId(null)}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Setor
                </label>
                <select
                  className="input-field"
                  value={editSetorId}
                  onChange={(e) => setEditSetorId(Number(e.target.value))}
                >
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Descricao
                </label>
                <input
                  className="input-field"
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
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
                    value={editValor}
                    onChange={(e) => setEditValor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Data
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Status
                </label>
                <div className="flex gap-2">
                  {[
                    { v: "pago", l: "Pago" },
                    { v: "pendente", l: "Pendente" },
                    { v: "previsto", l: "Previsto" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setEditStatus(opt.v)}
                      className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                        editStatus === opt.v
                          ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-700">
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Foto do recibo / nota fiscal
                </label>
                {editRecibo && (
                  <a href={editRecibo} target="_blank" rel="noreferrer" className="mb-2 block">
                    <img src={editRecibo} alt="Recibo" className="h-24 w-24 rounded-xl object-cover" />
                  </a>
                )}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  disabled={enviandoRecibo}
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) enviarRecibo(arquivo);
                  }}
                  className="block w-full text-xs text-neutral-500"
                />
                {enviandoRecibo && <p className="mt-1 text-xs text-neutral-400">Enviando...</p>}
              </div>

              <button
                className="btn-primary w-full"
                disabled={salvandoEdicao}
                onClick={salvarEdicao}
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
