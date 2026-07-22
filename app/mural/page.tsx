"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/components/auth/AuthContext";

interface Aviso {
  id: number;
  autor_id: number | null;
  autor_nome: string;
  texto: string;
  criado_em: string;
}

function formatarData(dataStr: string) {
  const data = new Date(dataStr.replace(" ", "T") + "Z");
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function MuralPage() {
  const usuario = useAuth();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    setCarregando(true);
    fetch("/api/avisos")
      .then((r) => r.json())
      .then(setAvisos)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function publicar() {
    if (!texto.trim() || !usuario) return;
    setEnviando(true);
    try {
      await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autor_id: usuario.id, autor_nome: usuario.nome, texto: texto.trim() }),
      });
      setTexto("");
      carregar();
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(id: number) {
    const confirmar = window.confirm("Apagar este aviso?");
    if (!confirmar) return;
    await fetch(`/api/avisos/${id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <>
      <Header titulo="Mural de Avisos" subtitulo="Comunicados da equipe" />
      <div className="space-y-3 p-4">
        <div className="card space-y-2">
          <textarea
            className="input-field min-h-[80px]"
            placeholder="Escreva um aviso para a equipe..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button className="btn-primary w-full" disabled={enviando || !texto.trim()} onClick={publicar}>
            {enviando ? "Publicando..." : "Publicar aviso"}
          </button>
        </div>

        {carregando && <div className="card text-center text-sm text-neutral-400">Carregando...</div>}
        {!carregando && avisos.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">Nenhum aviso ainda.</div>
        )}

        {avisos.map((a) => (
          <div key={a.id} className="card">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold">{a.autor_nome}</p>
              <p className="text-[11px] text-neutral-400">{formatarData(a.criado_em)}</p>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{a.texto}</p>
            {usuario && (usuario.id === a.autor_id || usuario.tipo === "chefe") && (
              <button
                onClick={() => excluir(a.id)}
                className="mt-2 text-xs font-medium text-danger"
              >
                Apagar
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
