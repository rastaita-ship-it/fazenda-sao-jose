"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface Atividade {
  id: number;
  setor_tipo: string;
  nome: string;
  descricao: string | null;
}

const ROTULOS_SETOR: Record<string, string> = {
  cafe: "Cafe",
  gado: "Gado",
  ovelhas: "Ovelhas",
  outra_cultura: "Oficina e outras culturas",
};

export default function ConhecimentoPage() {
  const [itens, setItens] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    fetch("/api/activity-templates")
      .then((r) => r.json())
      .then(setItens)
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = itens.filter((i) =>
    i.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const agrupados = filtrados.reduce((acc, item) => {
    if (!acc[item.setor_tipo]) acc[item.setor_tipo] = [];
    acc[item.setor_tipo].push(item);
    return acc;
  }, {} as Record<string, Atividade[]>);

  return (
    <>
      <Header titulo="Central de Conhecimento" subtitulo="Dicas tecnicas por atividade" />
      <div className="space-y-4 p-4">
        <input
          className="input-field"
          placeholder="Buscar atividade (ex: poda, vacinacao)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {carregando && <div className="card text-center text-sm text-neutral-400">Carregando...</div>}

        {!carregando &&
          Object.entries(agrupados).map(([setorTipo, atividades]) => (
            <div key={setorTipo}>
              <h2 className="mb-2 text-sm font-semibold text-neutral-500">
                {ROTULOS_SETOR[setorTipo] ?? setorTipo}
              </h2>
              <div className="space-y-2">
                {atividades
                  .filter((a) => a.descricao)
                  .map((a) => (
                    <div key={a.id} className="card">
                      <p className="text-sm font-semibold">{a.nome}</p>
                      <p className="mt-1 text-sm text-neutral-500">{a.descricao}</p>
                    </div>
                  ))}
              </div>
            </div>
          ))}

        {!carregando && filtrados.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">Nenhuma atividade encontrada.</div>
        )}
      </div>
    </>
  );
}
