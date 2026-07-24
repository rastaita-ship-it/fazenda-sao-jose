"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";

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

  async function perguntar() {
    if (!pergunta.trim()) return;
    setEnviando(true);
    setErro("");
    setResposta("");

    const formData = new FormData();
    formData.append("pergunta", pergunta.trim());
    if (foto) formData.append("foto", foto);

    try {
      const res = await fetch("/api/mentor", { method: "POST", body: formData });
      const dados = await res.json();
      if (!res.ok) {
        setErro(dados.error ?? "Erro ao consultar.");
        return;
      }
      setResposta(dados.resposta);
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
              onClick={perguntar}
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
