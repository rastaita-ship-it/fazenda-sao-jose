"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface Funcionario {
  id: number;
  nome: string;
  funcao: string | null;
}

interface RegistroPonto {
  id: number;
  funcionario_id: number;
  tipo: "entrada" | "saida";
  data_hora: string;
  funcionario_nome: string;
}

function formatarHora(dataHora: string) {
  return new Date(dataHora.replace(" ", "T")).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obterLocalizacao(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este navegador nao suporta localizacao."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () =>
        reject(
          new Error(
            "Nao foi possivel acessar sua localizacao. Verifique se o GPS esta ligado e se voce permitiu o acesso a localizacao para este site."
          )
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function PontoPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [registrosHoje, setRegistrosHoje] = useState<RegistroPonto[]>([]);
  const [batendoId, setBatendoId] = useState<number | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [funcaoNova, setFuncaoNova] = useState("");
  const [tipoNovo, setTipoNovo] = useState("campo");
  const [pinNovo, setPinNovo] = useState("");
  const [tipoContratoNovo, setTipoContratoNovo] = useState("fixo");
  const [salarioNovo, setSalarioNovo] = useState("");
  const [erroCadastro, setErroCadastro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  function carregarFuncionarios() {
    fetch("/api/employees").then((r) => r.json()).then(setFuncionarios);
  }

  function carregarRegistrosHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    fetch(`/api/timeclock?data=${hoje}`).then((r) => r.json()).then(setRegistrosHoje);
  }

  useEffect(() => {
    carregarFuncionarios();
    carregarRegistrosHoje();
  }, []);

  function ultimoRegistroDe(funcionarioId: number) {
    return registrosHoje.find((r) => r.funcionario_id === funcionarioId);
  }

  async function bater(funcionarioId: number) {
    setBatendoId(funcionarioId);
    setMensagem("");
    setMensagemErro("");
    try {
      const localizacao = await obterLocalizacao();

      const res = await fetch("/api/timeclock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funcionario_id: funcionarioId,
          latitude: localizacao.latitude,
          longitude: localizacao.longitude,
        }),
      });

      const dados = await res.json();

      if (!res.ok) {
        setMensagemErro(dados.error ?? "Nao foi possivel registrar o ponto.");
        return;
      }

      const nomeFunc = funcionarios.find((f) => f.id === funcionarioId)?.nome ?? "";
      setMensagem(
        `Registrado: ${dados.tipo === "entrada" ? "Entrada" : "Saida"} para ${nomeFunc} as ${formatarHora(dados.data_hora)}`
      );
      carregarRegistrosHoje();
      setTimeout(() => setMensagem(""), 4000);
    } catch (err) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao obter localizacao.");
    } finally {
      setBatendoId(null);
    }
  }

  async function salvarFuncionario() {
    if (!nomeNovo.trim()) return;
    setErroCadastro("");
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nomeNovo.trim(),
        funcao: funcaoNova.trim() || null,
        tipo: tipoNovo,
        pin: pinNovo,
        tipo_contrato: tipoContratoNovo,
        salario_mensal: tipoContratoNovo === "fixo" && salarioNovo ? Number(salarioNovo.replace(",", ".")) : null,
      }),
    });
    const dados = await res.json();
    if (!res.ok) {
      setErroCadastro(dados.error ?? "Erro ao cadastrar funcionario.");
      return;
    }
    setNomeNovo("");
    setFuncaoNova("");
    setTipoNovo("campo");
    setPinNovo("");
    setTipoContratoNovo("fixo");
    setSalarioNovo("");
    setMostrarForm(false);
    carregarFuncionarios();
  }

  return (
    <>
      <Header titulo="Ponto Eletronico" subtitulo="Registro de entrada e saida" />
      <div className="space-y-3 p-4">
        {mensagem && (
          <div className="card border-brand-300 bg-brand-50 text-center text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {mensagem}
          </div>
        )}
        {mensagemErro && (
          <div className="card border-danger bg-red-50 text-center text-sm font-medium text-danger dark:bg-red-900/20">
            {mensagemErro}
          </div>
        )}

        <a
          href="/ponto/banco-de-horas"
          className="block w-full rounded-2xl border border-neutral-300 py-3 text-center text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
        >
          Ver banco de horas
        </a>

        {funcionarios.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">
            Nenhum funcionario cadastrado ainda.
          </div>
        )}

        {funcionarios.map((f) => {
          const ultimo = ultimoRegistroDe(f.id);
          const proximaAcao = !ultimo || ultimo.tipo === "saida" ? "entrada" : "saida";
          return (
            <div key={f.id} className="card flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{f.nome}</p>
                {f.funcao && <p className="text-xs text-neutral-500">{f.funcao}</p>}
                {ultimo && (
                  <p className="text-xs text-neutral-400">
                    Ultimo registro hoje: {ultimo.tipo === "entrada" ? "Entrada" : "Saida"} as{" "}
                    {formatarHora(ultimo.data_hora)}
                  </p>
                )}
              </div>
              <button
                onClick={() => bater(f.id)}
                disabled={batendoId === f.id}
                className={proximaAcao === "entrada" ? "btn-primary" : "btn-danger"}
                style={{ minWidth: "110px" }}
              >
                {batendoId === f.id
                  ? "Localizando..."
                  : proximaAcao === "entrada"
                  ? "Bater entrada"
                  : "Bater saida"}
              </button>
            </div>
          );
        })}

        {!mostrarForm ? (
          <button className="btn-primary w-full" onClick={() => setMostrarForm(true)}>
            + Cadastrar funcionario
          </button>
        ) : (
          <div className="card space-y-3">
            <input
              className="input-field"
              placeholder="Nome do funcionario"
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Funcao (opcional): Vaqueiro, Diarista..."
              value={funcaoNova}
              onChange={(e) => setFuncaoNova(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTipoNovo("campo")}
                className={`rounded-xl border py-2 text-sm font-medium ${
                  tipoNovo === "campo"
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                }`}
              >
                Funcionario de campo
              </button>
              <button
                onClick={() => setTipoNovo("chefe")}
                className={`rounded-xl border py-2 text-sm font-medium ${
                  tipoNovo === "chefe"
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                }`}
              >
                Administrador
              </button>
            </div>
            <input
              className="input-field"
              placeholder="PIN de 4 numeros (para entrar no app)"
              inputMode="numeric"
              maxLength={4}
              value={pinNovo}
              onChange={(e) => setPinNovo(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTipoContratoNovo("fixo")}
                className={`rounded-xl border py-2 text-sm font-medium ${
                  tipoContratoNovo === "fixo"
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                }`}
              >
                Contrato fixo
              </button>
              <button
                onClick={() => setTipoContratoNovo("diarista")}
                className={`rounded-xl border py-2 text-sm font-medium ${
                  tipoContratoNovo === "diarista"
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                }`}
              >
                Diarista/Temporario
              </button>
            </div>
            {tipoContratoNovo === "fixo" && (
              <input
                className="input-field"
                placeholder="Salario mensal (R$) - opcional"
                inputMode="decimal"
                value={salarioNovo}
                onChange={(e) => setSalarioNovo(e.target.value)}
              />
            )}
            {erroCadastro && <p className="text-sm text-danger">{erroCadastro}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-xl border border-neutral-300 py-3 text-sm font-medium text-neutral-500 dark:border-neutral-700"
                onClick={() => setMostrarForm(false)}
              >
                Cancelar
              </button>
              <button className="btn-primary" onClick={salvarFuncionario}>
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
