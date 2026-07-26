"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

interface ManejoAtrasado {
  id: number;
  atividade_nome: string;
  data_planejada: string;
  setor_nome: string;
  setor_cor: string;
}

interface ItemEstoqueBaixo {
  id: number;
  nome: string;
  unidade: string;
  quantidade_atual: number;
  quantidade_minima: number;
}

interface AlertaCusto {
  setor_nome: string;
  setor_cor: string;
  despesaAtual: number;
  despesaAnterior: number;
  variacaoPercentual: number;
}

interface Diagnostico {
  manejosAtrasados: ManejoAtrasado[];
  estoqueBaixo: ItemEstoqueBaixo[];
  alertasCusto: AlertaCusto[];
  saldoMesNegativo: boolean;
  saldoMes: number;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataCurta(dataStr: string) {
  const data = new Date(dataStr + "T12:00:00");
  return data.toLocaleDateString("pt-BR");
}

export default function DiagnosticoPage() {
  const [dados, setDados] = useState<Diagnostico | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/diagnostico")
      .then((r) => r.json())
      .then(setDados)
      .finally(() => setCarregando(false));
  }, []);

  const totalAlertas =
    (dados?.manejosAtrasados.length ?? 0) +
    (dados?.estoqueBaixo.length ?? 0) +
    (dados?.alertasCusto.length ?? 0) +
    (dados?.saldoMesNegativo ? 1 : 0);

  return (
    <>
      <Header titulo="Diagnostico" subtitulo="A fazenda avaliada automaticamente" />
      <div className="space-y-4 p-4">
        {carregando && <div className="card text-center text-sm text-neutral-400">Analisando...</div>}

        {!carregando && dados && totalAlertas === 0 && (
          <div className="card border-brand-300 bg-brand-50 text-center dark:bg-brand-900/20">
            <p className="text-2xl">{"\u2705"}</p>
            <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
              Tudo em ordem por enquanto
            </p>
            <p className="text-xs text-neutral-500">Nenhum alerta encontrado.</p>
          </div>
        )}

        {!carregando && dados && dados.saldoMesNegativo && (
          <div className="card border-danger bg-red-50 dark:bg-red-900/20">
            <p className="text-sm font-semibold text-danger">Saldo do mes esta negativo</p>
            <p className="text-xs text-neutral-500">
              Saldo atual: {formatarMoeda(dados.saldoMes)}
            </p>
          </div>
        )}

        {!carregando && dados && dados.alertasCusto.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-neutral-500">Custo fora do padrao</h2>
            <div className="space-y-2">
              {dados.alertasCusto.map((a, i) => (
                <div key={i} className="card border-warning bg-warning/5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.setor_cor }} />
                    <p className="text-sm font-semibold">{a.setor_nome}</p>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Despesa {a.variacaoPercentual}% maior que o mes passado
                    ({formatarMoeda(a.despesaAnterior)} para {formatarMoeda(a.despesaAtual)})
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!carregando && dados && dados.manejosAtrasados.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-neutral-500">
              Manejos atrasados ({dados.manejosAtrasados.length})
            </h2>
            <div className="space-y-2">
              {dados.manejosAtrasados.map((m) => (
                <div key={m.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.setor_cor }} />
                    <div>
                      <p className="text-sm font-medium">{m.atividade_nome}</p>
                      <p className="text-xs text-neutral-500">{m.setor_nome}</p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-danger">{formatarDataCurta(m.data_planejada)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!carregando && dados && dados.estoqueBaixo.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-neutral-500">Estoque baixo</h2>
            <div className="space-y-2">
              {dados.estoqueBaixo.map((item) => (
                <div key={item.id} className="card flex items-center justify-between">
                  <p className="text-sm font-medium">{item.nome}</p>
                  <p className="text-xs font-medium text-danger">
                    {item.quantidade_atual} {item.unidade} (minimo: {item.quantidade_minima})
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
