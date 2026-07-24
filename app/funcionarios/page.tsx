"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface Funcionario {
  id: number;
  nome: string;
  funcao: string | null;
  tipo: string;
  tipo_contrato: string;
  ativo: number;
}

export default function FuncionariosPage() {
  const [itens, setItens] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nome, setNome] = useState("");
  const [funcao, setFuncao] = useState("");
  const [tipo, setTipo] = useState("campo");
  const [tipoContrato, setTipoContrato] = useState("fixo");
  const [salario, setSalario] = useState("");
  const [pin, setPin] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);

  function carregar() {
    setCarregando(true);
    fetch("/api/employees")
      .then((r) => r.json())
      .then(setItens)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  function limparForm() {
    setNome("");
    setFuncao("");
    setTipo("campo");
    setTipoContrato("fixo");
    setSalario("");
    setPin("");
    setErro("");
    setEditandoId(null);
  }

  function abrirNovo() {
    limparForm();
    setMostrarForm(true);
  }

  function abrirEdicao(f: Funcionario) {
    setEditandoId(f.id);
    setNome(f.nome);
    setFuncao(f.funcao ?? "");
    setTipo(f.tipo);
    setTipoContrato(f.tipo_contrato);
    setSalario("");
    setPin("");
    setErro("");
    setMostrarForm(true);
  }

  async function salvar() {
    if (!nome.trim()) return;
    setErro("");

    if (!editandoId && (!pin || !/^[0-9]{4}$/.test(pin))) {
      setErro("PIN deve ter exatamente 4 numeros.");
      return;
    }

    setSalvando(true);
    try {
      if (editandoId) {
        const corpo: Record<string, unknown> = {
          nome: nome.trim(),
          funcao: funcao.trim() || null,
          tipo,
          tipo_contrato: tipoContrato,
        };
        if (salario) corpo.salario_mensal = Number(salario.replace(",", "."));
        if (pin) corpo.pin = pin;

        const res = await fetch(`/api/employees/${editandoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        });
        const dados = await res.json();
        if (!res.ok) {
          setErro(dados.error ?? "Erro ao salvar.");
          return;
        }
      } else {
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: nome.trim(),
            funcao: funcao.trim() || null,
            tipo,
            pin,
            tipo_contrato: tipoContrato,
            salario_mensal: salario ? Number(salario.replace(",", ".")) : null,
          }),
        });
        const dados = await res.json();
        if (!res.ok) {
          setErro(dados.error ?? "Erro ao cadastrar.");
          return;
        }
      }
      setMostrarForm(false);
      limparForm();
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: number, nomeItem: string) {
    const confirmar = window.confirm(`Desativar "${nomeItem}"? Ele nao conseguira mais entrar no sistema.`);
    if (!confirmar) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <>
      <Header titulo="Funcionarios" subtitulo="Gerenciar acessos da equipe" />
      <div className="space-y-3 p-4">
        <button className="btn-primary w-full" onClick={abrirNovo}>
          + Cadastrar funcionario
        </button>

        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Carregando...</div>
        )}

        {!carregando && itens.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">
            Nenhum funcionario cadastrado.
          </div>
        )}

        {itens.map((f) => (
          <div key={f.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{f.nome}</p>
                {f.funcao && <p className="text-xs text-neutral-500">{f.funcao}</p>}
                <div className="mt-1 flex gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      f.tipo === "chefe"
                        ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                        : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                    }`}
                  >
                    {f.tipo === "chefe" ? "Administrador" : "Colaborador"}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800">
                    {f.tipo_contrato === "fixo" ? "Fixo" : "Diarista"}
                  </span>
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-1">
                <button
                  onClick={() => abrirEdicao(f)}
                  aria-label="Editar funcionario"
                  className="rounded-xl p-2 text-neutral-400 active:bg-brand-500/10 active:text-brand-600"
                >
                  editar
                </button>
                <button
                  onClick={() => excluir(f.id, f.nome)}
                  aria-label="Desativar funcionario"
                  className="rounded-xl p-2 text-neutral-400 active:bg-danger/10 active:text-danger"
                >
                  excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editandoId ? "Editar funcionario" : "Novo funcionario"}
              </h2>
              <button
                onClick={() => setMostrarForm(false)}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
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
              <input
                className="input-field"
                placeholder="Funcao (opcional)"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTipo("campo")}
                  className={`rounded-xl border py-2 text-sm font-medium ${
                    tipo === "campo"
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                      : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                  }`}
                >
                  Colaborador
                </button>
                <button
                  onClick={() => setTipo("chefe")}
                  className={`rounded-xl border py-2 text-sm font-medium ${
                    tipo === "chefe"
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                      : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                  }`}
                >
                  Administrador
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTipoContrato("fixo")}
                  className={`rounded-xl border py-2 text-sm font-medium ${
                    tipoContrato === "fixo"
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                      : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                  }`}
                >
                  Contrato fixo
                </button>
                <button
                  onClick={() => setTipoContrato("diarista")}
                  className={`rounded-xl border py-2 text-sm font-medium ${
                    tipoContrato === "diarista"
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                      : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                  }`}
                >
                  Diarista
                </button>
              </div>

              {tipoContrato === "fixo" && (
                <input
                  className="input-field"
                  placeholder="Salario mensal (R$) - opcional"
                  inputMode="decimal"
                  value={salario}
                  onChange={(e) => setSalario(e.target.value)}
                />
              )}

              <input
                className="input-field"
                placeholder={editandoId ? "Novo PIN (deixe vazio para manter)" : "PIN de 4 numeros"}
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              />

              {erro && <p className="text-sm text-danger">{erro}</p>}
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
