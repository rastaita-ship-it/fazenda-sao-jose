"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

const UNIDADES_SUGERIDAS = ["kg", "L", "sc", "un", "cabeca", "arroba", "m2", "ha"];
const CATEGORIAS_INSUMO = [
  { valor: "fertilizante", rotulo: "Fertilizante" },
  { valor: "semente", rotulo: "Semente" },
  { valor: "defensivo", rotulo: "Defensivo" },
  { valor: "racao", rotulo: "Racao" },
  { valor: "medicamento", rotulo: "Medicamento" },
  { valor: "combustivel", rotulo: "Combustivel" },
  { valor: "outro", rotulo: "Outro" },
];

interface Insumo {
  id: number;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade_atual: number;
  quantidade_minima: number | null;
  custo_unitario: number | null;
}

interface Produto {
  id: number;
  produto: string;
  setor_id: number | null;
  setor_nome: string | null;
  unidade: string;
  quantidade_atual: number;
  local_armazenamento: string | null;
}

interface Setor {
  id: number;
  nome: string;
}

interface Funcionario {
  id: number;
  nome: string;
}

interface Talhao {
  id: number;
  nome: string;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function rotuloCategoria(valor: string) {
  return CATEGORIAS_INSUMO.find((c) => c.valor === valor)?.rotulo ?? valor;
}

export default function EstoquePage() {
  const [aba, setAba] = useState<"producao" | "insumos">("producao");

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("fertilizante");
  const [unidade, setUnidade] = useState("kg");
  const [setorId, setSetorId] = useState<number | "">("");
  const [qtdInicial, setQtdInicial] = useState("");
  const [qtdMinima, setQtdMinima] = useState("");
  const [custoUnit, setCustoUnit] = useState("");
  const [localArm, setLocalArm] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [movId, setMovId] = useState<number | null>(null);
  const [movTipo, setMovTipo] = useState<"entrada" | "saida">("entrada");
  const [movQtd, setMovQtd] = useState("");
  const [movDesc, setMovDesc] = useState("");
  const [movPreco, setMovPreco] = useState("");
  const [movCustoTotal, setMovCustoTotal] = useState("");
  const [movFornecedor, setMovFornecedor] = useState("");
  const [movCriarLancamento, setMovCriarLancamento] = useState(true);
  const [movFuncionarioId, setMovFuncionarioId] = useState<number | "">("");
  const [movFinalidade, setMovFinalidade] = useState("");
  const [movTalhaoId, setMovTalhaoId] = useState<number | "">("");
  const [movErro, setMovErro] = useState("");
  const [movSalvando, setMovSalvando] = useState(false);

  function carregar() {
    setCarregando(true);
    Promise.all([
      fetch("/api/estoque-insumos").then((r) => r.json()),
      fetch("/api/estoque-producao").then((r) => r.json()),
    ])
      .then(([i, p]) => {
        setInsumos(i);
        setProdutos(p);
      })
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    // carregando ja nasce true; buscar direto aqui evita repetir os sets
    // sincronos que carregar() faz (usada tambem no recarregar manual).
    Promise.all([
      fetch("/api/estoque-insumos").then((r) => r.json()),
      fetch("/api/estoque-producao").then((r) => r.json()),
    ])
      .then(([i, p]) => {
        setInsumos(i);
        setProdutos(p);
      })
      .finally(() => setCarregando(false));
    fetch("/api/sectors").then((r) => r.json()).then(setSetores);
    fetch("/api/employees").then((r) => r.json()).then(setFuncionarios);
    fetch("/api/talhoes").then((r) => r.json()).then(setTalhoes);
  }, []);

  function limparForm() {
    setNome("");
    setCategoria("fertilizante");
    setUnidade("kg");
    setSetorId("");
    setQtdInicial("");
    setQtdMinima("");
    setCustoUnit("");
    setLocalArm("");
  }

  async function salvarNovo() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      if (aba === "insumos") {
        await fetch("/api/estoque-insumos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: nome.trim(),
            categoria,
            unidade,
            quantidade_atual: qtdInicial ? Number(qtdInicial.replace(",", ".")) : 0,
            quantidade_minima: qtdMinima ? Number(qtdMinima.replace(",", ".")) : null,
            custo_unitario: custoUnit ? Number(custoUnit.replace(",", ".")) : null,
            setor_id: setorId || null,
          }),
        });
      } else {
        await fetch("/api/estoque-producao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            produto: nome.trim(),
            setor_id: setorId || null,
            unidade,
            quantidade_atual: qtdInicial ? Number(qtdInicial.replace(",", ".")) : 0,
            local_armazenamento: localArm.trim() || null,
          }),
        });
      }
      limparForm();
      setMostrarForm(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  function abrirMov(id: number, tipo: "entrada" | "saida") {
    setMovId(id);
    setMovTipo(tipo);
    setMovQtd("");
    setMovDesc("");
    setMovPreco("");
    setMovCustoTotal("");
    setMovFornecedor("");
    setMovCriarLancamento(true);
    setMovFuncionarioId("");
    setMovFinalidade("");
    setMovTalhaoId("");
    setMovErro("");
  }

  async function salvarMov() {
    if (!movId || !movQtd) return;
    setMovSalvando(true);
    setMovErro("");
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const url = aba === "insumos" ? "/api/estoque-insumos/movimentacao" : "/api/estoque-producao/movimentacao";
      const corpoBase: Record<string, unknown> = {
        tipo: movTipo,
        quantidade: Number(movQtd.replace(",", ".")),
        data: hoje,
        descricao: movDesc.trim() || null,
      };
      if (aba === "insumos") {
        corpoBase.insumo_id = movId;
        if (movTipo === "entrada") {
          if (movCustoTotal) corpoBase.custo_total = Number(movCustoTotal.replace(",", "."));
          if (movFornecedor.trim()) corpoBase.fornecedor = movFornecedor.trim();
          corpoBase.criar_lancamento = movCriarLancamento;
        } else {
          if (movFuncionarioId) corpoBase.funcionario_id = movFuncionarioId;
          if (movFinalidade.trim()) corpoBase.finalidade = movFinalidade.trim();
          if (movTalhaoId) corpoBase.talhao_id = movTalhaoId;
        }
      } else {
        corpoBase.produto_id = movId;
        if (movTipo === "saida" && movPreco) corpoBase.preco_unitario = Number(movPreco.replace(",", "."));
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpoBase),
      });
      const dados = await res.json();
      if (!res.ok) {
        setMovErro(dados.error ?? "Erro ao registrar.");
        return;
      }
      setMovId(null);
      carregar();
    } finally {
      setMovSalvando(false);
    }
  }

  return (
    <>
      <Header titulo="Estoque" subtitulo="Producao e insumos" />
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setAba("producao")}
            className={`rounded-xl border py-2 text-sm font-medium ${
              aba === "producao"
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
            }`}
          >
            Producao
          </button>
          <button
            onClick={() => setAba("insumos")}
            className={`rounded-xl border py-2 text-sm font-medium ${
              aba === "insumos"
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
            }`}
          >
            Insumos
          </button>
        </div>

        <button className="btn-primary w-full" onClick={() => setMostrarForm(true)}>
          + Adicionar {aba === "insumos" ? "insumo" : "produto"}
        </button>

        <a
          href="/importar"
          className="block w-full rounded-xl border border-neutral-300 py-2.5 text-center text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
        >
          📥 Importar planilha CSV
        </a>

        {aba === "insumos" && (
          <a
            href="/historico-precos"
            className="block w-full rounded-xl border border-neutral-300 py-2.5 text-center text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
          >
            💲 Histórico de preços por fornecedor
          </a>
        )}

        {carregando && <div className="card text-center text-sm text-neutral-400">Carregando...</div>}

        {!carregando && aba === "insumos" &&
          insumos.map((item) => {
            const estoqueBaixo =
              item.quantidade_minima != null && item.quantidade_atual <= item.quantidade_minima;
            return (
              <div key={item.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.nome}</p>
                    <p className="text-xs text-neutral-500">{rotuloCategoria(item.categoria)}</p>
                    {item.custo_unitario != null && (
                      <p className="text-xs text-neutral-400">
                        {formatarMoeda(item.custo_unitario)} / {item.unidade}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${estoqueBaixo ? "text-danger" : ""}`}>
                      {item.quantidade_atual} {item.unidade}
                    </p>
                    {estoqueBaixo && <p className="text-[11px] font-medium text-danger">Estoque baixo</p>}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => abrirMov(item.id, "entrada")}
                    className="rounded-xl border border-brand-600 py-2 text-sm font-medium text-brand-600 dark:text-brand-400"
                  >
                    + Entrada
                  </button>
                  <button
                    onClick={() => abrirMov(item.id, "saida")}
                    className="rounded-xl border border-danger py-2 text-sm font-medium text-danger"
                  >
                    - Saida
                  </button>
                </div>
                <a
                  href={`/historico-precos?insumo_id=${item.id}`}
                  className="mt-2 block text-center text-xs font-medium text-neutral-500 dark:text-neutral-400"
                >
                  Ver histórico de preços →
                </a>
              </div>
            );
          })}

        {!carregando && aba === "producao" &&
          produtos.map((item) => (
            <div key={item.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.produto}</p>
                  {item.setor_nome && <p className="text-xs text-neutral-500">{item.setor_nome}</p>}
                  {item.local_armazenamento && (
                    <p className="text-xs text-neutral-400">{item.local_armazenamento}</p>
                  )}
                </div>
                <p className="text-lg font-bold">
                  {item.quantidade_atual} {item.unidade}
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => abrirMov(item.id, "entrada")}
                  className="rounded-xl border border-brand-600 py-2 text-sm font-medium text-brand-600 dark:text-brand-400"
                >
                  + Entrada
                </button>
                <button
                  onClick={() => abrirMov(item.id, "saida")}
                  className="rounded-xl border border-danger py-2 text-sm font-medium text-danger"
                >
                  - Saida
                </button>
              </div>
            </div>
          ))}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo {aba === "insumos" ? "insumo" : "produto"}</h2>
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
              {aba === "insumos" ? (
                <>
                  <select className="input-field" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                    {CATEGORIAS_INSUMO.map((c) => (
                      <option key={c.valor} value={c.valor}>
                        {c.rotulo}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input-field"
                    value={setorId}
                    onChange={(e) => setSetorId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Setor (opcional, usado nas despesas de compra)</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <select className="input-field" value={setorId} onChange={(e) => setSetorId(Number(e.target.value))}>
                  <option value="">Setor (opcional)</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              )}
              <input
                className="input-field"
                placeholder="Unidade"
                list="unidades-sugeridas"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
              />
              <datalist id="unidades-sugeridas">
                {UNIDADES_SUGERIDAS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input-field"
                  placeholder="Quantidade inicial"
                  inputMode="decimal"
                  value={qtdInicial}
                  onChange={(e) => setQtdInicial(e.target.value)}
                />
                {aba === "insumos" ? (
                  <input
                    className="input-field"
                    placeholder="Estoque minimo"
                    inputMode="decimal"
                    value={qtdMinima}
                    onChange={(e) => setQtdMinima(e.target.value)}
                  />
                ) : (
                  <input
                    className="input-field"
                    placeholder="Local (opcional)"
                    value={localArm}
                    onChange={(e) => setLocalArm(e.target.value)}
                  />
                )}
              </div>
              {aba === "insumos" && (
                <input
                  className="input-field"
                  placeholder="Custo por unidade (R$, opcional)"
                  inputMode="decimal"
                  value={custoUnit}
                  onChange={(e) => setCustoUnit(e.target.value)}
                />
              )}
              <button className="btn-primary w-full" disabled={salvando} onClick={salvarNovo}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {movId && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {movTipo === "entrada" ? "Registrar entrada" : "Registrar saida"}
              </h2>
              <button onClick={() => setMovId(null)} className="text-2xl leading-none text-neutral-400">
                x
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="input-field"
                inputMode="decimal"
                placeholder="Quantidade"
                value={movQtd}
                onChange={(e) => setMovQtd(e.target.value)}
              />
              {aba === "producao" && movTipo === "saida" && (
                <input
                  className="input-field"
                  inputMode="decimal"
                  placeholder="Preco por unidade (R$) - gera venda automatica"
                  value={movPreco}
                  onChange={(e) => setMovPreco(e.target.value)}
                />
              )}
              {aba === "insumos" && movTipo === "entrada" && (
                <>
                  <input
                    className="input-field"
                    inputMode="decimal"
                    placeholder="Custo total da compra (R$, opcional)"
                    value={movCustoTotal}
                    onChange={(e) => setMovCustoTotal(e.target.value)}
                  />
                  <input
                    className="input-field"
                    placeholder="Fornecedor (opcional)"
                    value={movFornecedor}
                    onChange={(e) => setMovFornecedor(e.target.value)}
                  />
                  {movCustoTotal && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={movCriarLancamento}
                        onChange={(e) => setMovCriarLancamento(e.target.checked)}
                      />
                      Lançar despesa automaticamente no fluxo de caixa
                    </label>
                  )}
                </>
              )}
              {aba === "insumos" && movTipo === "saida" && (
                <>
                  <select
                    className="input-field"
                    value={movFuncionarioId}
                    onChange={(e) => setMovFuncionarioId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Quem retirou (opcional)</option>
                    {funcionarios.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input-field"
                    placeholder="Pra que foi usado (ex: Adubacao do talhao 2)"
                    value={movFinalidade}
                    onChange={(e) => setMovFinalidade(e.target.value)}
                  />
                  <select
                    className="input-field"
                    value={movTalhaoId}
                    onChange={(e) => setMovTalhaoId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Talhao (opcional)</option>
                    {talhoes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <input
                className="input-field"
                placeholder="Descricao (opcional)"
                value={movDesc}
                onChange={(e) => setMovDesc(e.target.value)}
              />
              {movErro && <p className="text-sm text-danger">{movErro}</p>}
              <button
                className={movTipo === "entrada" ? "btn-primary w-full" : "btn-danger w-full"}
                disabled={movSalvando}
                onClick={salvarMov}
              >
                {movSalvando ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
