"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface IndicadorSetor {
  setor_id: number;
  nome: string;
  cor: string;
  area_hectares: number | null;
  receitas: number;
  despesas: number;
  lucro: number;
  totalProduzido: number;
  unidadePrincipal: string | null;
  produtividade: number | null;
  custoPorUnidade: number | null;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesAtual() {
  return new Date().getMonth() + 1;
}

function anoAtual() {
  return new Date().getFullYear();
}

const MESES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function IndicadoresPage() {
  const [mes, setMes] = useState(mesAtual());
  const [ano, setAno] = useState(anoAtual());
  const [dados, setDados] = useState<IndicadorSetor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoAreaId, setEditandoAreaId] = useState<number | null>(null);
  const [areaInput, setAreaInput] = useState("");
  const [salvandoArea, setSalvandoArea] = useState(false);

  function carregar() {
    setCarregando(true);
    const from = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const to = `${ano}-${String(mes).padStart(2, "0")}-31`;
    fetch(`/api/indicadores?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => setDados(d.setores))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, [mes, ano]);

  function mudarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes > 12) {
      novoMes = 1;
      novoAno += 1;
    } else if (novoMes < 1) {
      novoMes = 12;
      novoAno -= 1;
    }
    setMes(novoMes);
    setAno(novoAno);
  }

  function abrirEdicaoArea(setor: IndicadorSetor) {
    setEditandoAreaId(setor.setor_id);
    setAreaInput(setor.area_hectares ? String(setor.area_hectares) : "");
  }

  async function salvarArea() {
    if (!editandoAreaId) return;
    setSalvandoArea(true);
    try {
      await fetch(`/api/sectors/${editandoAreaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area_hectares: areaInput ? Number(areaInput.replace(",", ".")) : null,
        }),
      });
      setEditandoAreaId(null);
      carregar();
    } finally {
      setSalvandoArea(false);
    }
  }

  return (
    <>
      <Header titulo="Indicadores" subtitulo="Produtividade e custo por unidade" />
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => mudarMes(-1)}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {"<"}
          </button>
          <span className="text-sm font-semibold">
            {MESES[mes - 1]} de {ano}
          </span>
          <button
            onClick={() => mudarMes(1)}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {">"}
          </button>
        </div>

        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Calculando...</div>
        )}

        {!carregando &&
          dados.map((setor) => (
            <div key={setor.setor_id} className="card">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: setor.cor }} />
                  <h3 className="text-base font-semibold">{setor.nome}</h3>
                </div>
                <button
                  onClick={() => abrirEdicaoArea(setor)}
                  className="text-xs font-medium text-brand-600 dark:text-brand-400"
                >
                  {setor.area_hectares ? `${setor.area_hectares} ha` : "Definir area"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-[11px] text-neutral-500">Receita</p>
                  <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                    {formatarMoeda(setor.receitas)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-neutral-500">Despesa</p>
                  <p className="text-sm font-semibold text-danger">{formatarMoeda(setor.despesas)}</p>
                </div>
              </div>

              {setor.totalProduzido > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3 text-center dark:border-neutral-800">
                  <div>
                    <p className="text-[11px] text-neutral-500">Produzido</p>
                    <p className="text-sm font-semibold">
                      {setor.totalProduzido} {setor.unidadePrincipal}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-neutral-500">Custo por unidade</p>
                    <p className="text-sm font-semibold">
                      {setor.custoPorUnidade != null ? formatarMoeda(setor.custoPorUnidade) : "-"}
                    </p>
                  </div>
                  {setor.produtividade != null && (
                    <div className="col-span-2">
                      <p className="text-[11px] text-neutral-500">Produtividade</p>
                      <p className="text-sm font-semibold">
                        {setor.produtividade} {setor.unidadePrincipal}/ha
                      </p>
                    </div>
                  )}
                </div>
              )}

              {setor.totalProduzido === 0 && (
                <p className="mt-2 text-center text-xs text-neutral-400">
                  Sem producao registrada neste periodo (Estoque de Producao)
                </p>
              )}
            </div>
          ))}
      </div>

      {editandoAreaId && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Area do setor</h2>
              <button
                onClick={() => setEditandoAreaId(null)}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
                x
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="input-field"
                inputMode="decimal"
                placeholder="Area em hectares"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
              />
              <button className="btn-primary w-full" disabled={salvandoArea} onClick={salvarArea}>
                {salvandoArea ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
