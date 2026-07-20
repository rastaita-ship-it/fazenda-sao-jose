"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { ResumoFinanceiro, TipoSetor } from "@/lib/types";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TIPOS: { valor: TipoSetor; rotulo: string }[] = [
  { valor: "cafe", rotulo: "Café" },
  { valor: "gado", rotulo: "Gado" },
  { valor: "ovelhas", rotulo: "Ovelhas" },
  { valor: "outra_cultura", rotulo: "Outra cultura" },
];

const CORES = ["#3f8f34", "#8a5e2f", "#2f7127", "#b6874f", "#265a20", "#caa877"];

export default function SetoresPage() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoSetor>("outra_cultura");
  const [cor, setCor] = useState(CORES[0]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function carregar() {
    fetch("/api/summary").then((r) => r.json()).then(setResumo);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    if (!nome.trim()) {
      setErro("Digite um nome para o setor.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/sectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), tipo, cor }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErro(data.error ?? "Erro ao salvar setor.");
        return;
      }
      setNome("");
      setTipo("outra_cultura");
      setAberto(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Header titulo="Setores" subtitulo="Café, Gado, Ovelhas e outras culturas" />
      <div className="space-y-3 p-4">
        {resumo?.porSetor.map((s) => (
          <div key={s.setor_id} className="card">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.cor }} />
              <h3 className="text-base font-semibold">{s.nome}</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-neutral-500">Receitas</p>
                <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                  {formatarMoeda(s.receitas)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">Despesas</p>
                <p className="text-sm font-semibold text-danger">
                  {formatarMoeda(s.despesas)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">Saldo</p>
                <p className="text-sm font-semibold">{formatarMoeda(s.saldo)}</p>
              </div>
            </div>
          </div>
        ))}

        <button className="btn-primary w-full" onClick={() => setAberto(true)}>
          + Adicionar novo setor / cultura
        </button>
      </div>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo setor</h2>
              <button
                onClick={() => setAberto(false)}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Nome do setor
                </label>
                <input
                  className="input-field"
                  placeholder="Ex: Milho, Horta, Suínos..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
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

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Cor de identificação
                </label>
                <div className="flex gap-2">
                  {CORES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCor(c)}
                      style={{ backgroundColor: c }}
                      className={`h-9 w-9 rounded-full border-2 ${
                        cor === c ? "border-neutral-900 dark:border-white" : "border-transparent"
                      }`}
                      aria-label={`Escolher cor ${c}`}
                    />
                  ))}
                </div>
              </div>

              {erro && <p className="text-sm text-danger">{erro}</p>}

              <button className="btn-primary w-full" disabled={salvando} onClick={salvar}>
                {salvando ? "Salvando..." : "Salvar setor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
