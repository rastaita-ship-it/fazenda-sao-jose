"use client";

import { useEffect, useState } from "react";
import { Setor, TipoTransacao } from "@/lib/types";

const CATEGORIAS_FIXO = [
  "Depreciacao de maquinas e benfeitorias",
  "Impostos e taxas (ITR, INCRA)",
  "Salarios fixos",
  "Seguros",
  "Juros e financiamentos",
  "Aluguel",
  "Conta de luz",
  "Conta de agua",
  "Manutencao de instalacoes",
];

const CATEGORIAS_VARIAVEL = [
  "Insumos (sementes, adubo, defensivos)",
  "Combustivel e lubrificantes",
  "Mao de obra temporaria/diarista",
  "Manutencao de maquinas",
  "Transporte e frete",
  "Assistencia tecnica",
  "Embalagens",
];

export default function QuickAddButtons({ onSaved }: { onSaved: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoTransacao>("despesa");
  const [setores, setSetores] = useState<Setor[]>([]);
  const [salvando, setSalvando] = useState(false);

  const [setorId, setSetorId] = useState<number | "">("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("pago");

  const [classificacaoCusto, setClassificacaoCusto] = useState<"fixo" | "variavel" | "">("");
  const [categoria, setCategoria] = useState("");
  const [categoriaCustom, setCategoriaCustom] = useState("");

  useEffect(() => {
    if (aberto && setores.length === 0) {
      fetch("/api/sectors")
        .then((r) => r.json())
        .then(setSetores);
    }
  }, [aberto, setores.length]);

  function abrir(tipoSelecionado: TipoTransacao) {
    setTipo(tipoSelecionado);
    setAberto(true);
  }

  function fechar() {
    setAberto(false);
    setDescricao("");
    setValor("");
    setClassificacaoCusto("");
    setCategoria("");
    setCategoriaCustom("");
  }

  async function salvar() {
    if (!setorId || !descricao || !valor) return;
    setSalvando(true);
    try {
      const categoriaFinal = categoria === "outra" ? categoriaCustom : categoria;
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setor_id: setorId,
          tipo,
          descricao,
          valor: Number(valor.replace(",", ".")),
          data,
          status,
          categoria: categoriaFinal || null,
          classificacao_custo: tipo === "despesa" ? classificacaoCusto || null : null,
        }),
      });
      fechar();
      onSaved();
    } finally {
      setSalvando(false);
    }
  }

  const categoriasDisponiveis =
    classificacaoCusto === "fixo"
      ? CATEGORIAS_FIXO
      : classificacaoCusto === "variavel"
      ? CATEGORIAS_VARIAVEL
      : [];

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-primary" onClick={() => abrir("receita")}>
          + Receita
        </button>
        <button className="btn-danger" onClick={() => abrir("despesa")}>
          + Despesa
        </button>
      </div>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {tipo === "receita" ? "Nova receita" : "Nova despesa"}
              </h2>
              <button
                onClick={fechar}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Setor
                </label>
                <select
                  className="input-field"
                  value={setorId}
                  onChange={(e) => setSetorId(Number(e.target.value))}
                >
                  <option value="">Selecione um setor</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Descricao
                </label>
                <input
                  className="input-field"
                  placeholder="Ex: Compra de adubo"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Valor (R$)
                  </label>
                  <input
                    className="input-field"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Data
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
              </div>

              {tipo === "despesa" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Tipo de custo
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setClassificacaoCusto("fixo");
                          setCategoria("");
                        }}
                        className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                          classificacaoCusto === "fixo"
                            ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                            : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                        }`}
                      >
                        Custo fixo
                      </button>
                      <button
                        onClick={() => {
                          setClassificacaoCusto("variavel");
                          setCategoria("");
                        }}
                        className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                          classificacaoCusto === "variavel"
                            ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                            : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                        }`}
                      >
                        Custo variavel
                      </button>
                    </div>
                  </div>

                  {classificacaoCusto && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-500">
                        Categoria
                      </label>
                      <select
                        className="input-field"
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                      >
                        <option value="">Selecione</option>
                        {categoriasDisponiveis.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="outra">Outra (digitar)</option>
                      </select>
                    </div>
                  )}

                  {categoria === "outra" && (
                    <input
                      className="input-field"
                      placeholder="Nome da categoria"
                      value={categoriaCustom}
                      onChange={(e) => setCategoriaCustom(e.target.value)}
                    />
                  )}
                </>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Status
                </label>
                <div className="flex gap-2">
                  {[
                    { v: "pago", l: "Pago" },
                    { v: "pendente", l: "Pendente" },
                    { v: "previsto", l: "Previsto" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setStatus(opt.v)}
                      className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                        status === opt.v
                          ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={tipo === "receita" ? "btn-primary w-full" : "btn-danger w-full"}
                disabled={salvando}
                onClick={salvar}
              >
                {salvando ? "Salvando..." : "Salvar lancamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
