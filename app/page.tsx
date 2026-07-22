"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import SummaryCards from "@/components/dashboard/SummaryCards";
import QuickAddButtons from "@/components/dashboard/QuickAddButtons";
import SectorBreakdown from "@/components/dashboard/SectorBreakdown";
import { ResumoFinanceiro } from "@/lib/types";

export default function DashboardPage() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarResumo = useCallback(() => {
    setCarregando(true);
    fetch("/api/summary")
      .then((r) => r.json())
      .then(setResumo)
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  return (
    <>
      <Header titulo="Fazenda Sao Jose" />

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <a
            href="/clima"
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-neutral-900"
          >
            <span className="text-2xl">{"\u2600\uFE0F"}</span>
            <span className="text-xs font-medium">Clima</span>
          </a>
          <a
            href="/indicadores"
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-neutral-900"
          >
            <span className="text-2xl">{"\u{1F4C8}"}</span>
            <span className="text-xs font-medium">Indicadores</span>
          </a>
          <a
            href="/cotacao"
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-neutral-900"
          >
            <span className="text-2xl">{"\u{1F4B9}"}</span>
            <span className="text-xs font-medium">Cotacao</span>
          </a>
        </div>

        <QuickAddButtons onSaved={carregarResumo} />

        {carregando || !resumo ? (
          <div className="card animate-pulse text-center text-sm text-neutral-400">
            Carregando dados da fazenda...
          </div>
        ) : (
          <>
            <SummaryCards resumo={resumo} />
            <SectorBreakdown resumo={resumo} onAtualizado={carregarResumo} />
          </>
        )}

        <a
          href="/emergencia"
          className="block w-full rounded-2xl bg-danger py-4 text-center text-base font-bold text-white active:opacity-80"
        >
          {"\u{1F6A8}"} Emergencia
        </a>
      </div>
    </>
  );
}
