"use client";

import { useEffect, useState } from "react";

interface VacinaVencendo {
  id: number;
  produto: string;
  proxima_dose: string;
  animal_id: number;
  identificacao: string;
  nome: string | null;
}

function diasRestantes(data: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  return Math.round(
    (new Date(data + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000
  );
}

export default function AvisoVacinasVencendo() {
  const [itens, setItens] = useState<VacinaVencendo[]>([]);

  useEffect(() => {
    fetch("/api/animais/vacinas-vencendo")
      .then((r) => r.json())
      .then((lista) => setItens(Array.isArray(lista) ? lista : []))
      .catch(() => setItens([]));
  }, []);

  if (itens.length === 0) return null;

  const temVencida = itens.some((v) => diasRestantes(v.proxima_dose) < 0);

  return (
    <a
      href="/animais"
      className={`card block ${temVencida ? "border-danger bg-danger/5" : "border-warning bg-warning/5"}`}
    >
      <p className={`mb-2 text-sm font-semibold ${temVencida ? "text-danger" : "text-warning"}`}>
        {temVencida ? "Vacinas vencidas" : "Vacinas vencendo"} ({itens.length})
      </p>
      <div className="space-y-1">
        {itens.slice(0, 3).map((v) => {
          const dias = diasRestantes(v.proxima_dose);
          return (
            <div key={v.id} className="flex items-center justify-between text-sm">
              <span className="truncate font-medium">
                {v.produto} · {v.nome || v.identificacao}
              </span>
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
