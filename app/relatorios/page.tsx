"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import Header from "@/components/layout/Header";
import { ResumoFinanceiro } from "@/lib/types";

interface TendenciaMes {
  mes: string;
  receitas: number;
  despesas: number;
  lucro: number;
}

function formatarMesCurto(mesStr: string) {
  const [ano, mes] = mesStr.split("-");
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`;
}

export default function RelatoriosPage() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [tendencia, setTendencia] = useState<TendenciaMes[]>([]);

  useEffect(() => {
    fetch("/api/summary").then((r) => r.json()).then(setResumo);
    fetch("/api/tendencia").then((r) => r.json()).then(setTendencia);
  }, []);

  const dadosGrafico =
    resumo?.porSetor.map((s) => ({
      nome: s.nome,
      Saldo: Number(s.saldo.toFixed(2)),
    })) ?? [];

  const dadosTendencia = tendencia.map((t) => ({
    mes: formatarMesCurto(t.mes),
    Lucro: t.lucro,
    Receitas: t.receitas,
    Despesas: t.despesas,
  }));

  return (
    <>
      <Header titulo={"Relat\u00f3rios"} subtitulo={"Lucratividade por setor (m\u00eas atual)"} />
      <div className="space-y-4 p-4">
        <div className="card">
          <h2 className="mb-3 text-base font-semibold">Tendencia mensal (12 meses)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosTendencia}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) =>
                    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Receitas" stroke="#3f8f34" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Despesas" stroke="#dc2626" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Lucro" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

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
          Proximos passos: comparacao entre safras e exportacao de relatorio em PDF.
        </div>
      </div>
    </>
  );
}
