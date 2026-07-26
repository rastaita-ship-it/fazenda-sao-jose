"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface ProjecaoSetor {
  setor_id: number;
  nome: string;
  cor: string;
  temHistorico: boolean;
  anosDisponiveis: string[];
  projecao: number | null;
  produtividadeMediaPorHa?: number;
  unidade: string | null;
}

export default function ProjecaoSafraPage() {
  const [dados, setDados] = useState<ProjecaoSetor[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/projecao-safra")
      .then((r) => r.json())
      .then(setDados)
      .finally(() => setCarregando(false));
  }, []);

  return (
    <>
      <Header titulo="Projecao de Safra" subtitulo="Estimativa baseada no historico" />
      <div className="space-y-3 p-4">
        {carregando && <div className="card text-center text-sm text-neutral-400">Calculando...</div>}

        {!carregando && dados.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">Nenhum setor cadastrado.</div>
        )}

        {!carregando &&
          dados.map((s) => (
            <div key={s.setor_id} className="card">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.cor }} />
                <p className="text-sm font-semibold">{s.nome}</p>
              </div>

              {s.temHistorico ? (
                <>
                  <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                    {s.projecao} {s.unidade}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Media de {s.produtividadeMediaPorHa} {s.unidade}/ha, baseado em {s.anosDisponiveis.length}{" "}
                    ano(s) de historico ({s.anosDisponiveis.join(", ")})
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-400">
                  Ainda nao ha historico suficiente (safra anterior registrada) ou area em hectares nao
                  definida para calcular uma projecao confiavel deste setor.
                </p>
              )}
            </div>
          ))}

        <div className="card text-xs text-neutral-500">
          Essa estimativa melhora automaticamente conforme mais safras forem registradas no Estoque de
          Producao ao longo dos anos.
        </div>
      </div>
    </>
  );
}
