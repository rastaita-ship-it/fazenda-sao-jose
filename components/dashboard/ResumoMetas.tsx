"use client";

import { useEffect, useState } from "react";

interface Meta {
  id: number;
  titulo: string;
  tipo: string;
  valor_meta: number;
  progresso_atual: number;
  progresso_pct: number;
  no_ritmo: boolean;
  produto_unidade: string | null;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ResumoMetas() {
  const [metas, setMetas] = useState<Meta[] | null>(null);

  useEffect(() => {
    fetch("/api/metas")
      .then((r) => r.json())
      .then(setMetas)
      .catch(() => setMetas([]));
  }, []);

  if (!metas || metas.length === 0) return null;

  return (
    <a href="/metas" className="card block">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Metas da safra</h2>
        <span className="text-xs text-neutral-400">Ver todas →</span>
      </div>
      <div className="space-y-3">
        {metas.slice(0, 3).map((m) => {
          const concluida = m.progresso_pct >= 100;
          const corBarra = concluida || m.no_ritmo ? "bg-brand-500" : "bg-warning";
          const unidade = m.tipo === "producao" ? m.produto_unidade ?? "" : "";
          return (
            <div key={m.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="truncate font-medium">{m.titulo}</span>
                <span
                  className={
                    concluida
                      ? "font-semibold text-brand-600 dark:text-brand-400"
                      : m.no_ritmo
                      ? "text-neutral-400"
                      : "font-medium text-warning"
                  }
                >
                  {m.progresso_pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className={`h-full ${corBarra}`} style={{ width: `${Math.min(100, m.progresso_pct)}%` }} />
              </div>
              <p className="mt-0.5 text-[11px] text-neutral-400">
                {m.tipo === "producao"
                  ? `${m.progresso_atual.toLocaleString("pt-BR")} de ${m.valor_meta.toLocaleString("pt-BR")} ${unidade}`
                  : `${formatarMoeda(m.progresso_atual)} de ${formatarMoeda(m.valor_meta)}`}
              </p>
            </div>
          );
        })}
      </div>
    </a>
  );
}
