"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import SummaryCards from "@/components/dashboard/SummaryCards";
import QuickAddButtons from "@/components/dashboard/QuickAddButtons";
import SectorBreakdown from "@/components/dashboard/SectorBreakdown";
import { ResumoFinanceiro } from "@/lib/types";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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

  const agora = new Date();

  return (
    <>
      <Header
        titulo="Resumo Geral"
        subtitulo={`${MESES[agora.getMonth()]} de ${agora.getFullYear()}`}
      />

      <div className="space-y-4 p-4">
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
      </div>
    </>
  );
}
