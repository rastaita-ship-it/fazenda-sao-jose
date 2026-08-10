"use client";

import { useRef, useState } from "react";
import Header from "@/components/layout/Header";

interface LinhaResultado {
  numero: number;
  valores: Record<string, string>;
  erros: string[];
}

interface Previa {
  linhas: LinhaResultado[];
  total: number;
  validas: number;
  invalidas: number;
}

const TIPOS: { valor: string; rotulo: string; descricao: string }[] = [
  { valor: "patrimonio", rotulo: "Patrimônio", descricao: "Máquinas, veículos, equipamentos e outros bens" },
  { valor: "estoque_insumos", rotulo: "Estoque de insumos", descricao: "Adubo, semente, ração, defensivos..." },
  { valor: "estoque_producao", rotulo: "Estoque de produção", descricao: "Café, leite, lã e outros produtos já armazenados" },
];

export default function ImportarPage() {
  const [tipo, setTipo] = useState("patrimonio");
  const [csvTexto, setCsvTexto] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [carregandoPrevia, setCarregandoPrevia] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<{ inseridos: number; ignorados: number } | null>(null);
  const [erro, setErro] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function trocarTipo(novoTipo: string) {
    setTipo(novoTipo);
    setCsvTexto(null);
    setNomeArquivo("");
    setPrevia(null);
    setResultado(null);
    setErro("");
  }

  async function carregarArquivo(arquivo: File) {
    setErro("");
    setResultado(null);
    setNomeArquivo(arquivo.name);
    const texto = await arquivo.text();
    setCsvTexto(texto);
    setCarregandoPrevia(true);
    try {
      const res = await fetch("/api/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, csv: texto, confirmar: false }),
      });
      const dados = await res.json();
      if (!res.ok) {
        setErro(dados.error ?? "Erro ao ler a planilha.");
        setPrevia(null);
        return;
      }
      setPrevia(dados);
    } finally {
      setCarregandoPrevia(false);
    }
  }

  async function confirmarImportacao() {
    if (!csvTexto) return;
    setConfirmando(true);
    setErro("");
    try {
      const res = await fetch("/api/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, csv: csvTexto, confirmar: true }),
      });
      const dados = await res.json();
      if (!res.ok) {
        setErro(dados.error ?? "Erro ao importar.");
        return;
      }
      setResultado(dados);
      setPrevia(null);
      setCsvTexto(null);
      setNomeArquivo("");
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <>
      <Header titulo="Importar planilha" subtitulo="Cadastre patrimônio e estoque inicial em massa via CSV" />
      <div className="space-y-4 p-4 pb-24">
        <div className="space-y-2">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              onClick={() => trocarTipo(t.valor)}
              className={`card block w-full text-left ${tipo === t.valor ? "border-brand-600" : ""}`}
            >
              <p className="text-sm font-semibold">{t.rotulo}</p>
              <p className="text-xs text-neutral-500">{t.descricao}</p>
            </button>
          ))}
        </div>

        <a
          href={`/api/importar?tipo=${tipo}`}
          className="block w-full rounded-xl border border-neutral-300 py-2.5 text-center text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
        >
          ⬇️ Baixar modelo CSV
        </a>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Planilha preenchida (.csv)</label>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm text-neutral-500"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) carregarArquivo(arquivo);
            }}
          />
        </div>

        {carregandoPrevia && <div className="card text-center text-sm text-neutral-400">Lendo planilha...</div>}

        {erro && (
          <div className="card border-danger bg-danger/5">
            <p className="text-sm text-danger">{erro}</p>
          </div>
        )}

        {resultado && (
          <div className="card border-brand-300 bg-brand-50 dark:bg-brand-900/20">
            <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
              {resultado.inseridos} {resultado.inseridos === 1 ? "item importado" : "itens importados"} com sucesso.
            </p>
            {resultado.ignorados > 0 && (
              <p className="mt-1 text-xs text-neutral-500">{resultado.ignorados} linha(s) com erro foram ignoradas.</p>
            )}
          </div>
        )}

        {previa && (
          <div className="space-y-2">
            <div className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{nomeArquivo}</p>
                <p className="text-xs text-neutral-500">
                  {previa.validas} válida(s) · {previa.invalidas} com erro
                </p>
              </div>
              {previa.validas > 0 && (
                <button className="btn-primary" disabled={confirmando} onClick={confirmarImportacao}>
                  {confirmando ? "Importando..." : `Importar ${previa.validas}`}
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {previa.linhas.map((linha) => {
                const ok = linha.erros.length === 0;
                const primeiraColuna = Object.values(linha.valores)[0] || `Linha ${linha.numero}`;
                return (
                  <div
                    key={linha.numero}
                    className={`card ${ok ? "" : "border-danger bg-danger/5"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {ok ? "✅" : "❌"} Linha {linha.numero}: {primeiraColuna}
                      </p>
                    </div>
                    {!ok && (
                      <ul className="mt-1 list-disc pl-4 text-xs text-danger">
                        {linha.erros.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
