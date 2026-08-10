"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";

interface Insumo {
  id: number;
  nome: string;
  unidade: string;
}

interface Compra {
  id: number;
  data: string;
  quantidade: number;
  custo_total: number | null;
  preco_unitario: number | null;
  fornecedor: string | null;
  descricao: string | null;
}

interface ResumoFornecedor {
  fornecedor: string;
  compras: number;
  menorPreco: number;
  maiorPreco: number;
  precoMedio: number;
  ultimaCompra: string;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatarData(data: string) {
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
}

function HistoricoPrecosConteudo() {
  const searchParams = useSearchParams();
  const insumoIdInicial = searchParams.get("insumo_id");

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumoId, setInsumoId] = useState<number | null>(insumoIdInicial ? Number(insumoIdInicial) : null);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [fornecedores, setFornecedores] = useState<ResumoFornecedor[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    fetch("/api/estoque-insumos")
      .then((r) => r.json())
      .then(setInsumos);
  }, []);

  useEffect(() => {
    if (!insumoId) return;
    setCarregando(true);
    fetch(`/api/estoque-insumos/historico-precos?insumo_id=${insumoId}`)
      .then((r) => r.json())
      .then((dados) => {
        setCompras(dados.compras);
        setFornecedores(dados.fornecedores);
      })
      .finally(() => setCarregando(false));
  }, [insumoId]);

  const insumoAtual = insumos.find((i) => i.id === insumoId);

  if (insumoId && insumoAtual) {
    return (
      <>
        <Header titulo={insumoAtual.nome} subtitulo="Histórico de preços por compra" />
        <div className="space-y-4 p-4 pb-24">
          <button onClick={() => setInsumoId(null)} className="text-sm font-medium text-brand-600 dark:text-brand-400">
            ← Trocar de insumo
          </button>

          {carregando ? (
            <div className="card animate-pulse text-center text-sm text-neutral-400">Carregando...</div>
          ) : compras.length === 0 ? (
            <div className="card text-center text-sm text-neutral-400">
              Nenhuma compra com preço registrado ainda. Registre uma entrada com custo total pra começar o histórico.
            </div>
          ) : (
            <>
              {fornecedores.length > 0 && (
                <div className="space-y-2">
                  <h2 className="px-1 text-sm font-semibold">Comparativo de fornecedores</h2>
                  {fornecedores.map((f, i) => (
                    <div key={f.fornecedor} className={`card ${i === 0 ? "border-brand-300" : ""}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          {f.fornecedor}
                          {i === 0 && (
                            <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                              Mais barato
                            </span>
                          )}
                        </p>
                        <p className="text-sm font-semibold">{formatarMoeda(f.precoMedio)}/{insumoAtual.unidade}</p>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {f.compras} {f.compras === 1 ? "compra" : "compras"} · min {formatarMoeda(f.menorPreco)} · max{" "}
                        {formatarMoeda(f.maiorPreco)} · última em {formatarData(f.ultimaCompra)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <h2 className="px-1 text-sm font-semibold">Compras</h2>
                {compras.map((c) => (
                  <div key={c.id} className="card flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {c.quantidade} {insumoAtual.unidade}
                        {c.fornecedor ? ` · ${c.fornecedor}` : ""}
                      </p>
                      <p className="text-xs text-neutral-500">{formatarData(c.data)}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold">{formatarMoeda(c.preco_unitario!)}/{insumoAtual.unidade}</p>
                      {c.custo_total != null && <p className="text-xs text-neutral-400">{formatarMoeda(c.custo_total)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <Header titulo="Histórico de preços" subtitulo="Escolha o insumo para comparar fornecedores" />
      <div className="space-y-2 p-4">
        {insumos.length === 0 ? (
          <div className="card text-center text-sm text-neutral-400">Nenhum insumo cadastrado ainda.</div>
        ) : (
          insumos.map((i) => (
            <button key={i.id} onClick={() => setInsumoId(i.id)} className="card block w-full text-left">
              <p className="text-sm font-semibold">{i.nome}</p>
              <p className="text-xs text-neutral-500">Unidade: {i.unidade}</p>
            </button>
          ))
        )}
      </div>
    </>
  );
}

export default function HistoricoPrecosPage() {
  return (
    <Suspense fallback={null}>
      <HistoricoPrecosConteudo />
    </Suspense>
  );
}
