"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";

const PALAVRAS_RAPIDAS = [
  { label: "Castra\u00e7\u00e3o", pergunta: "Qual a melhor epoca e cuidados para castracao de bezerros?" },
  { label: "Fungo/ferrugem", pergunta: "Como identificar e tratar a ferrugem do cafeeiro?" },
  { label: "Bicheira", pergunta: "Como tratar e prevenir bicheira em animais?" },
  { label: "Mastite", pergunta: "Como identificar e tratar mastite em vacas leiteiras?" },
  { label: "Verminose", pergunta: "Qual o melhor protocolo de vermifugacao para o rebanho?" },
  { label: "Cio", pergunta: "Como identificar o cio em vacas para inseminacao?" },
  { label: "Poda", pergunta: "Qual a melhor epoca e tecnica de poda do cafeeiro?" },
  { label: "Vacina\u00e7\u00e3o", pergunta: "Qual o calendario de vacinacao recomendado para gado de corte?" },
];

export default function MentorPage() {
  const [pergunta, setPergunta] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  function selecionarFoto(arquivo: File) {
    setFoto(arquivo);
    setPreviewUrl(URL.createObjectURL(arquivo));
  }

  async function perguntar(textoForcado?: string) {
    const textoFinal = textoForcado ?? pergunta;
    if (!textoFinal.trim()) return;
    setPergunta(textoFinal);
    setEnviando(true);
    setErro("");
    setResposta("");

    const formData = new FormData();
    formData.append("pergunta", textoFinal.trim());
    if (foto) formData.append("foto", foto);

    try {
      const res = await fetch("/api/mentor", { method: "POST", body: formData });
      const dados = await res.json();
      if (!res.ok) {
        setErro(dados.error ?? "Erro ao consultar.");
        return;
      }
      setResposta(dados.resposta);
    } catch {
      setErro("Nao foi possivel conectar com a IA. Verifique sua internet.");
    } finally {
      setEnviando(false);
    }
  }

  function limpar() {
    setPergunta("");
    setFoto(null);
    setPreviewUrl(null);
    setResposta("");
    setErro("");
  }

  return (
    <>
      <Header titulo="Mentor Rural" subtitulo="Tire uma foto e pergunte" />
      <div className="space-y-4 p-4">
        <div className="card space-y-3">
          {previewUrl && (
            <img src={previewUrl} alt="Foto enviada" className="h-48 w-full rounded-2xl object-cover" />
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) selecionarFoto(arquivo);
            }}
            className="block w-full text-xs text-neutral-500"
          />
          <div className="flex flex-wrap gap-2">
            {PALAVRAS_RAPIDAS.map((item) => (
              <button
                key={item.label}
                disabled={enviando}
                onClick={() => perguntar(item.pergunta)}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-500 disabled:opacity-40 dark:border-neutral-700"
              >
                {item.label}
              </button>
            ))}
          </div>
          <textarea
            className="input-field min-h-[80px]"
            placeholder="O que voce quer perguntar? (ex: essa folha esta com fungo?)"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
          />
          {erro && <p className="text-sm text-danger">{erro}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={limpar}
              className="rounded-xl border border-neutral-300 py-3 text-sm font-medium text-neutral-500 dark:border-neutral-700"
            >
              Limpar
            </button>
            <button
              className="btn-primary"
              disabled={enviando || !pergunta.trim()}
              onClick={() => perguntar()}
            >
              {enviando ? "Pensando..." : "Perguntar"}
            </button>
          </div>
        </div>

        {resposta && (
          <div className="card border-brand-300 bg-brand-50 dark:bg-brand-900/20">
            <p className="mb-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
              Mentor Rural responde:
            </p>
            <p className="text-sm text-neutral-700 dark:text-neutral-200">{resposta}</p>
          </div>
        )}
      </div>
    </>
  );
}
