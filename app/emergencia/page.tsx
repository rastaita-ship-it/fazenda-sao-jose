"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/components/auth/AuthContext";

interface Contato {
  id: number;
  nome: string;
  categoria: string;
  telefone: string;
  observacao: string | null;
}

const CATEGORIAS = [
  { valor: "veterinario", rotulo: "Veterinario" },
  { valor: "mecanico", rotulo: "Mecanico" },
  { valor: "bombeiro", rotulo: "Bombeiros" },
  { valor: "policia", rotulo: "Policia" },
  { valor: "ambulancia", rotulo: "Ambulancia/SAMU" },
  { valor: "outro", rotulo: "Outro" },
];

function rotuloCategoria(valor: string) {
  return CATEGORIAS.find((c) => c.valor === valor)?.rotulo ?? valor;
}

export default function EmergenciaPage() {
  const usuario = useAuth();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("veterinario");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    setCarregando(true);
    fetch("/api/contatos-emergencia")
      .then((r) => r.json())
      .then(setContatos)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    if (!nome.trim() || !telefone.trim()) return;
    setSalvando(true);
    try {
      await fetch("/api/contatos-emergencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          categoria,
          telefone: telefone.trim(),
          observacao: observacao.trim() || null,
        }),
      });
      setNome("");
      setTelefone("");
      setObservacao("");
      setMostrarForm(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: number) {
    const confirmar = window.confirm("Remover este contato?");
    if (!confirmar) return;
    await fetch(`/api/contatos-emergencia/${id}`, { method: "DELETE" });
    carregar();
  }

  function acionarSOS() {
    const enviar = (mapsUrl?: string) => {
      const local = mapsUrl ? ` Minha localizacao: ${mapsUrl}` : "";
      const mensagem = `EMERGENCIA na Fazenda Sao Jose. Preciso de ajuda urgente.${local}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank");
    };

    if (!navigator.geolocation) {
      enviar();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        enviar(url);
      },
      () => enviar(),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <>
      <Header titulo="Emergencia" subtitulo="Contatos rapidos" />
      <div className="space-y-3 p-4">
        <button
          onClick={acionarSOS}
          className="w-full rounded-2xl bg-danger py-4 text-center text-base font-bold text-white active:opacity-80"
        >
          SOS - Enviar minha localizacao
        </button>

        {usuario?.tipo === "chefe" && (
          <button className="btn-primary w-full" onClick={() => setMostrarForm(true)}>
            + Adicionar contato
          </button>
        )}

        {carregando && <div className="card text-center text-sm text-neutral-400">Carregando...</div>}
        {!carregando && contatos.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">Nenhum contato cadastrado.</div>
        )}

        {contatos.map((c) => (
          <div key={c.id} className="card flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{c.nome}</p>
              <p className="text-xs text-neutral-500">{rotuloCategoria(c.categoria)}</p>
              {c.observacao && <p className="text-xs text-neutral-400">{c.observacao}</p>}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <a href={`tel:${c.telefone}`} className="btn-primary px-4 py-2 text-sm">
                Ligar
              </a>
              {usuario?.tipo === "chefe" && (
                <button onClick={() => excluir(c.id)} className="text-xs font-medium text-danger">
                  excluir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo contato</h2>
              <button onClick={() => setMostrarForm(false)} className="text-2xl leading-none text-neutral-400">
                x
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="input-field"
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <select className="input-field" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
              <input
                className="input-field"
                placeholder="Telefone (com DDD)"
                inputMode="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="Observacao (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
              <button className="btn-primary w-full" disabled={salvando} onClick={salvar}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
