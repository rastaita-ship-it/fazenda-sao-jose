"use client";

import { useEffect, useState } from "react";
import { ResumoFinanceiro } from "@/lib/types";

const CORES_PADRAO = ["#6f4a25", "#3f8f34", "#8cc97f", "#2563eb", "#dc2626", "#d97706", "#7c3aed", "#0891b2"];
const TIPOS_SETOR = [
  { valor: "cafe", rotulo: "Cafe" },
  { valor: "gado", rotulo: "Gado" },
  { valor: "ovelhas", rotulo: "Ovelhas" },
  { valor: "outra_cultura", rotulo: "Outra cultura" },
];

interface SetorCompleto {
  id: number;
  nome: string;
  tipo: string;
  cor: string;
  area_hectares: number | null;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SectorBreakdown({
  resumo,
  onAtualizado,
}: {
  resumo: ResumoFinanceiro;
  onAtualizado: () => void;
}) {
  const [setores, setSetores] = useState<SetorCompleto[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostrarNovo, setMostrarNovo] = useState(false);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("outra_cultura");
  const [cor, setCor] = useState(CORES_PADRAO[0]);
  const [area, setArea] = useState("");
  const [salvando, setSalvando] = useState(false);

  function carregarSetores() {
    fetch("/api/sectors").then((r) => r.json()).then(setSetores);
  }

  useEffect(() => {
    carregarSetores();
  }, []);

  function abrirEdicao(id: number) {
    const s = setores.find((x) => x.id === id);
    if (!s) return;
    setEditandoId(id);
    setNome(s.nome);
    setTipo(s.tipo);
    setCor(s.cor);
    setArea(s.area_hectares ? String(s.area_hectares) : "");
  }

  function abrirNovo() {
    setMostrarNovo(true);
    setNome("");
    setTipo("outra_cultura");
    setCor(CORES_PADRAO[0]);
    setArea("");
  }

  async function salvarEdicao() {
    if (!editandoId || !nome.trim()) return;
    setSalvando(true);
    try {
      await fetch(`/api/sectors/${editandoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          tipo,
          cor,
          area_hectares: area ? Number(area.replace(",", ".")) : null,
        }),
      });
      setEditandoId(null);
      carregarSetores();
      onAtualizado();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarNovo() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      await fetch("/api/sectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          tipo,
          cor,
          area_hectares: area ? Number(area.replace(",", ".")) : null,
        }),
      });
      setMostrarNovo(false);
      carregarSetores();
      onAtualizado();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!editandoId) return;
    const confirmar = window.confirm(`Excluir "${nome}"? Os lancamentos ja feitos permanecem no historico.`);
    if (!confirmar) return;
    await fetch(`/api/sectors/${editandoId}`, { method: "DELETE" });
    setEditandoId(null);
    carregarSetores();
    onAtualizado();
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Desempenho por setor</h2>
        <button onClick={abrirNovo} className="text-xs font-medium text-brand-600 dark:text-brand-400">
          + Novo
        </button>
      </div>
      <div className="space-y-3">
        {resumo.porSetor.map((s) => {
          const positivo = s.saldo >= 0;
          const total = s.receitas + s.despesas;
          const pctReceita = total > 0 ? (s.receitas / total) * 100 : 0;

          return (
            <button
              key={s.setor_id}
              onClick={() => abrirEdicao(s.setor_id)}
              className="block w-full text-left"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.cor }} />
                  <span className="text-sm font-medium">{s.nome}</span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    positivo ? "text-brand-600 dark:text-brand-400" : "text-danger"
                  }`}
                >
                  {formatarMoeda(s.saldo)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full bg-brand-500" style={{ width: `${pctReceita}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {(editandoId !== null || mostrarNovo) && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editandoId ? "Editar setor" : "Novo setor"}</h2>
              <button
                onClick={() => {
                  setEditandoId(null);
                  setMostrarNovo(false);
                }}
                className="text-2xl leading-none text-neutral-400"
              >
                x
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="input-field"
                placeholder="Nome do setor"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS_SETOR.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
              <input
                className="input-field"
                placeholder="Area em hectares (opcional)"
                inputMode="decimal"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
              <div>
                <p className="mb-2 text-xs font-medium text-neutral-500">Cor</p>
                <div className="flex flex-wrap gap-2">
                  {CORES_PADRAO.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCor(c)}
                      className={`h-8 w-8 rounded-full ${cor === c ? "ring-2 ring-offset-2 ring-brand-600" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <button
                className="btn-primary w-full"
                disabled={salvando}
                onClick={editandoId ? salvarEdicao : salvarNovo}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              {editandoId && (
                <button onClick={excluir} className="w-full rounded-xl border border-danger py-3 text-sm font-medium text-danger">
                  Excluir setor
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
