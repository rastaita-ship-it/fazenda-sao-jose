"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface Balanco {
  periodo: { from: string; to: string; dias: number };
  receitas: number;
  custoFixoLancado: number;
  maoDeObraFixa: number;
  depreciacaoPeriodo: number;
  custoFixoTotal: number;
  custoVariavelTotal: number;
  naoClassificado: number;
  custoTotal: number;
  lucro: number;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesAtual() {
  return new Date().getMonth() + 1;
}

function anoAtual() {
  return new Date().getFullYear();
}

const MESES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function BalancoPage() {
  const [mes, setMes] = useState(mesAtual());
  const [ano, setAno] = useState(anoAtual());
  const [balanco, setBalanco] = useState<Balanco | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    const from = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const to = `${ano}-${String(mes).padStart(2, "0")}-31`;
    fetch(`/api/balanco?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setBalanco)
      .finally(() => setCarregando(false));
  }, [mes, ano]);

  function mudarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes > 12) {
      novoMes = 1;
      novoAno += 1;
    } else if (novoMes < 1) {
      novoMes = 12;
      novoAno -= 1;
    }
    setMes(novoMes);
    setAno(novoAno);
  }

  const lucroPositivo = (balanco?.lucro ?? 0) >= 0;
  const pctFixo = balanco && balanco.custoTotal > 0 ? (balanco.custoFixoTotal / balanco.custoTotal) * 100 : 0;
  const pctVariavel = balanco && balanco.custoTotal > 0 ? (balanco.custoVariavelTotal / balanco.custoTotal) * 100 : 0;

  return (
    <>
      <Header titulo="Balanco Geral" subtitulo="Saude economica da fazenda" />
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => mudarMes(-1)}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {"<"}
          </button>
          <span className="text-sm font-semibold">
            {MESES[mes - 1]} de {ano}
          </span>
          <button
            onClick={() => mudarMes(1)}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {">"}
          </button>
        </div>

        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Calculando...</div>
        )}

        {!carregando && balanco && (
          <>
            <div className="card text-center">
              <p className="text-sm text-neutral-500">Resultado do periodo</p>
              <p
                className={`text-3xl font-bold ${
                  lucroPositivo ? "text-brand-600 dark:text-brand-400" : "text-danger"
                }`}
              >
                {formatarMoeda(balanco.lucro)}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {lucroPositivo ? "Lucro no periodo" : "Prejuizo no periodo"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card">
                <p className="text-xs text-neutral-500">Receitas</p>
                <p className="text-lg font-semibold text-brand-600 dark:text-brand-400">
                  {formatarMoeda(balanco.receitas)}
                </p>
              </div>
              <div className="card">
                <p className="text-xs text-neutral-500">Custo total</p>
                <p className="text-lg font-semibold text-danger">
                  {formatarMoeda(balanco.custoTotal)}
                </p>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-3 text-sm font-semibold">Custo fixo vs variavel</h3>
              <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full bg-brand-600" style={{ width: `${pctFixo}%` }} />
                <div className="h-full bg-warning" style={{ width: `${pctVariavel}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-brand-600" />
                  Fixo: {formatarMoeda(balanco.custoFixoTotal)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  Variavel: {formatarMoeda(balanco.custoVariavelTotal)}
                </span>
              </div>
            </div>

            <div className="card">
              <h3 className="mb-3 text-sm font-semibold">Detalhamento do custo fixo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Despesas fixas lancadas</span>
                  <span className="font-medium">{formatarMoeda(balanco.custoFixoLancado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Mao de obra fixa (automatico)</span>
                  <span className="font-medium">{formatarMoeda(balanco.maoDeObraFixa)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Depreciacao do patrimonio (automatico)</span>
                  <span className="font-medium">{formatarMoeda(balanco.depreciacaoPeriodo)}</span>
                </div>
              </div>
            </div>

            {balanco.naoClassificado > 0 && (
              <div className="card border-warning bg-warning/5">
                <p className="text-sm text-warning">
                  {formatarMoeda(balanco.naoClassificado)} em despesas sem classificacao (fixo/variavel).
                  Edite esses lancamentos no Fluxo de Caixa para um balanco mais preciso.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
