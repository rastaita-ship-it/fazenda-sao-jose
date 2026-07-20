"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface Funcionario {
  id: number;
  nome: string;
  funcao: string | null;
}

interface ResumoDia {
  data: string;
  horasTrabalhadas: number;
  horasEsperadas: number;
  saldo: number;
}

interface ResumoFuncionario {
  saldoTotalHoras: number;
  porDia: ResumoDia[];
}

function formatarData(data: string) {
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
  });
}

export default function BancoDeHorasPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [resumo, setResumo] = useState<ResumoFuncionario | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((lista: Funcionario[]) => {
        setFuncionarios(lista);
        if (lista.length > 0) setSelecionadoId(lista[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selecionadoId) return;
    setCarregando(true);
    fetch(`/api/timeclock/summary?funcionario_id=${selecionadoId}`)
      .then((r) => r.json())
      .then(setResumo)
      .finally(() => setCarregando(false));
  }, [selecionadoId]);

  const saldoPositivo = (resumo?.saldoTotalHoras ?? 0) >= 0;

  return (
    <>
      <Header titulo="Banco de Horas" subtitulo="Saldo do mês por funcionário" />
      <div className="space-y-4 p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {funcionarios.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelecionadoId(f.id)}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                selecionadoId === f.id
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              {f.nome}
            </button>
          ))}
        </div>

        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Calculando...</div>
        )}

        {!carregando && resumo && (
          <>
            <div className="card text-center">
              <p className="text-sm text-neutral-500">Saldo do mês</p>
              <p
                className={`text-3xl font-bold ${
                  saldoPositivo ? "text-brand-600 dark:text-brand-400" : "text-danger"
                }`}
              >
                {saldoPositivo ? "+" : ""}
                {resumo.saldoTotalHoras}h
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {saldoPositivo
                  ? "Horas a favor do funcionário"
                  : "Horas devendo (abaixo da jornada esperada)"}
              </p>
            </div>

            <div className="card">
              <h3 className="mb-2 text-sm font-semibold">Detalhe por dia</h3>
              <div className="space-y-1">
                {resumo.porDia.length === 0 && (
                  <p className="text-sm text-neutral-400">Nenhum registro no período.</p>
                )}
                {resumo.porDia.map((d) => (
                  <div
                    key={d.data}
                    className="flex items-center justify-between border-b border-neutral-100 py-1.5 text-sm last:border-0 dark:border-neutral-800"
                  >
                    <span className="capitalize text-neutral-600 dark:text-neutral-300">
                      {formatarData(d.data)}
                    </span>
                    <span className="text-neutral-400">
                      {d.horasTrabalhadas}h / {d.horasEsperadas}h
                    </span>
                    <span
                      className={
                        d.saldo >= 0
                          ? "font-medium text-brand-600 dark:text-brand-400"
                          : "font-medium text-danger"
                      }
                    >
                      {d.saldo >= 0 ? "+" : ""}
                      {d.saldo}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
