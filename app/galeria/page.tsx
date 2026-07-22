"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/components/auth/AuthContext";

interface Registro {
  id: number;
  autor_nome: string;
  categoria: string;
  descricao: string | null;
  foto_url: string;
  setor_nome: string | null;
  criado_em: string;
}

const CATEGORIAS = [
  { valor: "praga_doenca", rotulo: "Praga ou doenca", icone: "\u{1F41B}" },
  { valor: "fauna_flora", rotulo: "Fauna e flora", icone: "\u{1F98E}" },
  { valor: "seguranca", rotulo: "Seguranca", icone: "\u26A0\uFE0F" },
  { valor: "manutencao", rotulo: "Manutencao/Estrutura", icone: "\u{1F527}" },
  { valor: "curiosidade", rotulo: "Curiosidade", icone: "\u{1F4F8}" },
  { valor: "outro", rotulo: "Outro", icone: "\u{1F4CC}" },
];

function infoCategoria(valor: string) {
  return CATEGORIAS.find((c) => c.valor === valor) ?? { rotulo: valor, icone: "\u{1F4CC}" };
}

function formatarData(dataStr: string) {
  const data = new Date(dataStr.replace(" ", "T") + "Z");
  return data.toLocaleDateString("pt-BR");
}

export default function GaleriaPage() {
  const usuario = useAuth();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<string>("");
  const [mostrarForm, setMostrarForm] = useState(false);

  const [categoria, setCategoria] = useState("fauna_flora");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  function carregar() {
    setCarregando(true);
    const url = filtro ? `/api/galeria?categoria=${filtro}` : "/api/galeria";
    fetch(url)
      .then((r) => r.json())
      .then(setRegistros)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  async function enviarFoto(arquivo: File) {
    if (!usuario) return;
    setEnviando(true);
    setErro("");
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("categoria", categoria);
    formData.append("descricao", descricao.trim());
    formData.append("autor_id", String(usuario.id));
    formData.append("autor_nome", usuario.nome);

    try {
      const res = await fetch("/api/galeria", { method: "POST", body: formData });
      if (!res.ok) {
        const dados = await res.json();
        setErro(dados.error ?? "Erro ao enviar.");
        return;
      }
      setDescricao("");
      setMostrarForm(false);
      carregar();
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(id: number) {
    const confirmar = window.confirm("Apagar este registro?");
    if (!confirmar) return;
    await fetch(`/api/galeria/${id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <>
      <Header titulo="Galeria de Campo" subtitulo="Registros visuais do dia a dia" />
      <div className="space-y-3 p-4">
        <button className="btn-primary w-full" onClick={() => setMostrarForm(true)}>
          + Registrar foto
        </button>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltro("")}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
              filtro === ""
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
            }`}
          >
            Todos
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c.valor}
              onClick={() => setFiltro(c.valor)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                filtro === c.valor
                  ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
              }`}
            >
              {c.icone} {c.rotulo}
            </button>
          ))}
        </div>

        {carregando && <div className="card text-center text-sm text-neutral-400">Carregando...</div>}
        {!carregando && registros.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">Nenhum registro ainda.</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {registros.map((r) => {
            const info = infoCategoria(r.categoria);
            return (
              <div key={r.id} className="card p-2">
                <img src={r.foto_url} alt={r.categoria} className="mb-2 h-32 w-full rounded-xl object-cover" />
                <p className="text-xs font-semibold">
                  {info.icone} {info.rotulo}
                </p>
                {r.descricao && <p className="mt-1 text-xs text-neutral-500">{r.descricao}</p>}
                <p className="mt-1 text-[10px] text-neutral-400">
                  {r.autor_nome} - {formatarData(r.criado_em)}
                </p>
                {usuario && usuario.tipo === "chefe" && (
                  <button onClick={() => excluir(r.id)} className="mt-1 text-[10px] font-medium text-danger">
                    excluir
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo registro</h2>
              <button onClick={() => setMostrarForm(false)} className="text-2xl leading-none text-neutral-400">
                x
              </button>
            </div>
            <div className="space-y-3">
              <select className="input-field" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.icone} {c.rotulo}
                  </option>
                ))}
              </select>
              <input
                className="input-field"
                placeholder="Descricao (opcional)"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={enviando}
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) enviarFoto(arquivo);
                }}
                className="block w-full text-xs text-neutral-500"
              />
              {enviando && <p className="text-xs text-neutral-400">Enviando...</p>}
              {erro && <p className="text-sm text-danger">{erro}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
