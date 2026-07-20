"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import Header from "@/components/layout/Header";
import { ResumoFinanceiro } from "@/lib/types";

export default function RelatoriosPage() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);

  useEffect(() => {
    fetch("/api/summary").then((r) => r.json()).then(setResumo);
  }, []);

  const dadosGrafico =
    resumo?.porSetor.map((s) => ({
      nome: s.nome,
      Saldo: Number(s.saldo.toFixed(2)),
    })) ?? [];

  return (
    <>
      <Header titulo="Relatórios" subtitulo="Lucratividade por setor (mês atual)" />
      <div className="space-y-4 p-4">
        <div className="card">
          <h2 className="mb-3 text-base font-semibold">Saldo por setor</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) =>
                    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  }
                />
                <Bar dataKey="Saldo" radius={[6, 6, 0, 0]} fill="#3f8f34" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card text-sm text-neutral-500">
          Próximos passos: balanço mensal/anual detalhado, comparação entre safras e
          exportação de relatório em PDF.
        </div>
      </div>
    </>
  );
}
