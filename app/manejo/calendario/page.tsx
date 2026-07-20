"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface ManejoCalendario {
  id: number;
  setor_id: number;
  setor_nome: string;
  setor_cor: string;
  atividade_nome: string;
  data_planejada: string;
  status: string;
  funcionario_nome: string | null;
}

const MESES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const STATUS_LABEL: Record<string, string> = {
  planejado: "Planejado",
  concluido: "Concluido",
  alterado: "Alterado",
  cancelado: "Cancelado",
};

function hoje() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
}

function diasNoMes(ano: number, mes: number) {
  return new Date(ano, mes, 0).getDate();
}

function primeiroDiaSemana(ano: number, mes: number) {
  return new Date(ano, mes - 1, 1).getDay();
}

export default function CalendarioPage() {
  const inicial = hoje();
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState(inicial.mes);
  const [manejos, setManejos] = useState<ManejoCalendario[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(
    ano === inicial.ano && mes === inicial.mes ? inicial.dia : null
  );

  useEffect(() => {
    setCarregando(true);
    fetch(`/api/manejos/calendario?ano=${ano}&mes=${mes}`)
      .then((r) => r.json())
      .then(setManejos)
      .finally(() => setCarregando(false));
  }, [ano, mes]);

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
    setDiaSelecionado(null);
  }

  const totalDias = diasNoMes(ano, mes);
  const offset = primeiroDiaSemana(ano, mes);

  const porDia = new Map<number, ManejoCalendario[]>();
  for (const m of manejos) {
    const diaNum = Number(m.data_planejada.slice(8, 10));
    if (!porDia.has(diaNum)) porDia.set(diaNum, []);
    porDia.get(diaNum)!.push(m);
  }

  const celulas: (number | null)[] = [];
  for (let i = 0; i < offset; i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);

  const atividadesDoDiaSelecionado = diaSelecionado ? porDia.get(diaSelecionado) ?? [] : [];
  const ehHoje = (d: number) => ano === inicial.ano && mes === inicial.mes && d === inicial.dia;

  return (
    <>
      <Header titulo="Calendario" subtitulo="Visao geral de todos os setores" />
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

        <div className="card">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-neutral-400">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celulas.map((d, i) => {
              if (d === null) return <div key={`vazio-${i}`} />;
              const atividadesDia = porDia.get(d) ?? [];
              const coresUnicas = Array.from(new Set(atividadesDia.map((a) => a.setor_cor))).slice(0, 4);
              const selecionado = diaSelecionado === d;

              return (
                <button
                  key={d}
                  onClick={() => setDiaSelecionado(d)}
                  className={`flex aspect-square flex-col items-center justify-start rounded-lg pt-1 text-xs transition ${
                    selecionado
                      ? "bg-brand-600 text-white"
                      : ehHoje(d)
                      ? "bg-brand-50 font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <span>{d}</span>
                  {coresUnicas.length > 0 && (
                    <div className="mt-1 flex gap-0.5">
                      {coresUnicas.map((cor, idx) => (
                        <span
                          key={idx}
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: selecionado ? "white" : cor }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {carregando && (
          <div className="card text-center text-sm text-neutral-400">Carregando...</div>
        )}

        {diaSelecionado && !carregando && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
              {diaSelecionado} de {MESES[mes - 1]}
            </h3>
            {atividadesDoDiaSelecionado.length === 0 && (
              <div className="card text-center text-sm text-neutral-400">
                Nenhuma atividade neste dia.
              </div>
            )}
            {atividadesDoDiaSelecionado.map((a) => (
              <div key={a.id} className="card flex items-center gap-3">
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: a.setor_cor }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.atividade_nome}</p>
                  <p className="text-xs text-neutral-500">
                    {a.setor_nome}
                    {a.funcionario_nome && <> - {a.funcionario_nome}</>}
                  </p>
                </div>
                <span className="flex-shrink-0 text-[11px] font-medium text-neutral-400">
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
