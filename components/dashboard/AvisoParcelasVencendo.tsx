"use client";

import { useEffect, useState } from "react";

interface ParcelaVencendo {
  id: number;
  descricao: string;
  proxima_parcela: string;
}

function diasRestantes(data: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  return Math.round(
    (new Date(data + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000
  );
}

export default function AvisoParcelasVencendo() {
  const [itens, setItens] = useState<ParcelaVencendo[]>([]);

  useEffect(() => {
    fetch("/api/financiamentos")
      .then((r) => r.json())
      .then((lista: ParcelaVencendo[]) => {
        const limite = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
        setItens(
          Array.isArray(lista)
            ? lista
                .filter((f) => f.proxima_parcela <= limite)
                .sort((a, b) => (a.proxima_parcela < b.proxima_parcela ? -1 : 1))
            : []
        );
      })
      .catch(() => setItens([]));
  }, []);

  if (itens.length === 0) return null;

  const temVencida = itens.some((f) => diasRestantes(f.proxima_parcela) < 0);

  return (
    <a
      href="/financiamentos"
      className={`card block ${temVencida ? "border-danger bg-danger/5" : "border-warning bg-warning/5"}`}
    >
      <p className={`mb-2 text-sm font-semibold ${temVencida ? "text-danger" : "text-warning"}`}>
        {temVencida ? "Parcelas vencidas" : "Parcelas vencendo"} ({itens.length})
      </p>
      <div className="space-y-1">
        {itens.slice(0, 3).map((f) => {
          const dias = diasRestantes(f.proxima_parcela);
          return (
            <div key={f.id} className="flex items-center justify-between text-sm">
              <span className="truncate font-medium">{f.descricao}</span>
              <span className="flex-shrink-0 text-xs text-neutral-500">
                {dias < 0 ? `Venceu ha ${Math.abs(dias)}d` : dias === 0 ? "Vence hoje" : `${dias}d`}
              </span>
            </div>
          );
        })}
        {itens.length > 3 && <p className="text-xs text-neutral-400">+{itens.length - 3} outras</p>}
      </div>
    </a>
  );
}
