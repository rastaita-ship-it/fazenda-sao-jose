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

const PALAVRAS_RAPIDAS = ["Castracao", "Fungo/ferrugem", "Bicheira", "Mastite", "Verminose", "Cio"];

export default function ConhecimentoPage() {
  const [itens, setItens] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  const [perguntaIA, setPerguntaIA] = useState("");
  const [respostaIA, setRespostaIA] = useState("");
  const [buscandoIA, setBuscandoIA] = useState(false);
  const [erroIA, setErroIA] = useState("");

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

  async function perguntarIA(texto?: string) {
    const pergunta = texto ?? perguntaIA;
    if (!pergunta.trim()) return;
    setBuscandoIA(true);
    setErroIA("");
    setRespostaIA("");
    try {
      const res = await fetch("/api/conhecimento-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta }),
      });
      const dados = await res.json();
      if (!res.ok) {
        setErroIA(dados.error ?? "Erro ao consultar.");
        return;
      }
      setRespostaIA(dados.resposta);
    } finally {
      setBuscandoIA(false);
    }
  }

  return (
    <>
      <Header titulo="Central de Conhecimento" subtitulo="Dicas tecnicas por atividade" />
      <div className="space-y-4 p-4">
        <div className="card space-y-3">
          <p className="text-sm font-semibold">Perguntar a IA</p>
          <div className="flex flex-wrap gap-2">
            {PALAVRAS_RAPIDAS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPerguntaIA(p);
                  perguntarIA(p);
                }}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 dark:border-neutral-700"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input-field"
              placeholder="Digite um assunto (ex: mastite em vacas)"
              value={perguntaIA}
              onChange={(e) => setPerguntaIA(e.target.value)}
            />
            <button
              onClick={() => perguntarIA()}
              disabled={buscandoIA || !perguntaIA.trim()}
              className="btn-primary flex-shrink-0 px-4"
            >
              {buscandoIA ? "..." : "Buscar"}
            </button>
          </div>
          {erroIA && <p className="text-sm text-danger">{erroIA}</p>}
          {respostaIA && (
            <div className="rounded-2xl bg-brand-50 p-3 dark:bg-brand-900/20">
              <p className="text-sm text-neutral-700 dark:text-neutral-200">{respostaIA}</p>
            </div>
          )}
        </div>

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
