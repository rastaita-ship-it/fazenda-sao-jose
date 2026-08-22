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
  const [visao, setVisao] = useState<"mensal" | "anual">("mensal");
  const [mes, setMes] = useState(mesAtual());
  const [ano, setAno] = useState(anoAtual());
  const [balanco, setBalanco] = useState<Balanco | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [comparativo, setComparativo] = useState<{ ano: number; receitas: number; despesas: number; lucro: number }[]>([]);

  const from = visao === "anual" ? `${ano}-01-01` : `${ano}-${String(mes).padStart(2, "0")}-01`;
  const to = visao === "anual" ? `${ano}-12-31` : `${ano}-${String(mes).padStart(2, "0")}-31`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- precisa mostrar loading a cada troca de mes/ano/visao
    setCarregando(true);
    fetch(`/api/balanco?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setBalanco)
      .finally(() => setCarregando(false));
  }, [from, to]);

  useEffect(() => {
    if (visao !== "anual") return;
    let cancelado = false;
    Promise.all(
      [ano - 2, ano - 1, ano].map((anoComparado) =>
        fetch(`/api/balanco?from=${anoComparado}-01-01&to=${anoComparado}-12-31`)
          .then((r) => r.json())
          .then((b: Balanco) => ({
            ano: anoComparado,
            receitas: b.receitas,
            despesas: b.custoTotal,
            lucro: b.lucro,
          }))
      )
    ).then((linhas) => {
      if (!cancelado) setComparativo(linhas);
    });
    return () => {
      cancelado = true;
    };
  }, [visao, ano]);

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
        <div className="flex rounded-2xl border border-neutral-300 p-1 dark:border-neutral-700">
          <button
            onClick={() => setVisao("mensal")}
            className={`flex-1 rounded-xl py-1.5 text-sm font-medium ${
              visao === "mensal" ? "bg-brand-600 text-white" : "text-neutral-500"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setVisao("anual")}
            className={`flex-1 rounded-xl py-1.5 text-sm font-medium ${
              visao === "anual" ? "bg-brand-600 text-white" : "text-neutral-500"
            }`}
          >
            Anual
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => (visao === "anual" ? setAno((a) => a - 1) : mudarMes(-1))}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {"<"}
          </button>
          <span className="text-sm font-semibold">
            {visao === "anual" ? ano : `${MESES[mes - 1]} de ${ano}`}
          </span>
          <button
            onClick={() => (visao === "anual" ? setAno((a) => a + 1) : mudarMes(1))}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {">"}
          </button>
        </div>

        <a
          href={`/api/exportar/transacoes?from=${from}&to=${to}`}
          className="block w-full rounded-2xl border border-neutral-300 py-2.5 text-center text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
        >
          {"\u{1F4E5}"} Exportar CSV {visao === "anual" ? "do ano" : "do mes"}
        </a>

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

            {visao === "anual" && comparativo.length > 0 && (
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold">Comparativo entre anos</h3>
                <div className="space-y-2">
                  {comparativo.map((linha) => {
                    const positivo = linha.lucro >= 0;
                    return (
                      <div
                        key={linha.ano}
                        className={`flex items-center justify-between rounded-xl p-2 text-sm ${
                          linha.ano === ano ? "bg-brand-500/10" : ""
                        }`}
                      >
                        <span className="font-medium">{linha.ano}</span>
                        <span className="text-neutral-500">{formatarMoeda(linha.receitas)}</span>
                        <span className="text-neutral-500">{formatarMoeda(linha.despesas)}</span>
                        <span className={`font-semibold ${positivo ? "text-brand-600 dark:text-brand-400" : "text-danger"}`}>
                          {formatarMoeda(linha.lucro)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between px-2 text-[10px] text-neutral-400">
                  <span>Ano</span>
                  <span>Receitas</span>
                  <span>Custos</span>
                  <span>Lucro</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
