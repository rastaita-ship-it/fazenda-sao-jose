"use client";

import { useEffect, useState } from "react";

interface DocumentoVencendo {
  id: number;
  tipo: string;
  titulo: string;
  data_vencimento: string;
}

function diasRestantes(dataVencimento: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  return Math.round(
    (new Date(dataVencimento + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000
  );
}

export default function AvisoDocumentosVencendo() {
  const [itens, setItens] = useState<DocumentoVencendo[]>([]);

  useEffect(() => {
    fetch("/api/documentos?vencendo_em=30")
      .then((r) => r.json())
      .then(setItens)
      .catch(() => setItens([]));
  }, []);

  if (itens.length === 0) return null;

  const temVencido = itens.some((d) => diasRestantes(d.data_vencimento) < 0);

  return (
    <a
      href="/documentos"
      className={`card block ${temVencido ? "border-danger bg-danger/5" : "border-warning bg-warning/5"}`}
    >
      <p className={`mb-2 text-sm font-semibold ${temVencido ? "text-danger" : "text-warning"}`}>
        {temVencido ? "Documentos vencidos" : "Documentos vencendo"} ({itens.length})
      </p>
      <div className="space-y-1">
        {itens.slice(0, 3).map((d) => {
          const dias = diasRestantes(d.data_vencimento);
          return (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <span className="truncate font-medium">{d.titulo}</span>
              <span className="flex-shrink-0 text-xs text-neutral-500">
                {dias < 0 ? `Venceu ha ${Math.abs(dias)}d` : dias === 0 ? "Vence hoje" : `${dias}d`}
              </span>
            </div>
          );
        })}
        {itens.length > 3 && <p className="text-xs text-neutral-400">+{itens.length - 3} outros</p>}
      </div>
    </a>
  );
}
