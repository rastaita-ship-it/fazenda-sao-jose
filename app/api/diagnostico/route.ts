import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-estoque";
import "@/lib/db-manejo";
import { ehAdminLogado } from "@/lib/auth-helpers";

function formatarData(data: Date) {
  return data.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const hoje = new Date();
  const hojeStr = formatarData(hoje);

  const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

  const manejosAtrasados = db
    .prepare(
      `SELECT m.id, m.atividade_nome, m.data_planejada, s.nome AS setor_nome, s.cor AS setor_cor
       FROM manejos m
       JOIN setores s ON s.id = m.setor_id
       WHERE m.data_planejada < ? AND m.data_realizada IS NULL
       ORDER BY m.data_planejada ASC
       LIMIT 20`
    )
    .all(hojeStr);

  const estoqueBaixo = db
    .prepare(
      `SELECT id, nome, unidade, quantidade_atual, quantidade_minima
       FROM estoque_insumos
       WHERE quantidade_minima IS NOT NULL AND quantidade_atual <= quantidade_minima
       ORDER BY nome ASC`
    )
    .all();

  const despesasAtual = db
    .prepare(
      `SELECT t.setor_id, s.nome AS setor_nome, s.cor AS setor_cor, COALESCE(SUM(t.valor), 0) AS total
       FROM transacoes t
       JOIN setores s ON s.id = t.setor_id
       WHERE t.tipo = 'despesa' AND t.status = 'pago' AND t.data BETWEEN ? AND ?
       GROUP BY t.setor_id`
    )
    .all(formatarData(inicioMesAtual), formatarData(fimMesAtual)) as {
    setor_id: number;
    setor_nome: string;
    setor_cor: string;
    total: number;
  }[];

  const despesasAnterior = db
    .prepare(
      `SELECT setor_id, COALESCE(SUM(valor), 0) AS total
       FROM transacoes
       WHERE tipo = 'despesa' AND status = 'pago' AND data BETWEEN ? AND ?
       GROUP BY setor_id`
    )
    .all(formatarData(inicioMesAnterior), formatarData(fimMesAnterior)) as {
    setor_id: number;
    total: number;
  }[];

  const mapaAnterior = new Map(despesasAnterior.map((d) => [d.setor_id, d.total]));

  const alertasCusto = despesasAtual
    .map((d) => {
      const anterior = mapaAnterior.get(d.setor_id) ?? 0;
      if (anterior <= 0) return null;
      const variacao = ((d.total - anterior) / anterior) * 100;
      if (variacao < 20) return null;
      return {
        setor_nome: d.setor_nome,
        setor_cor: d.setor_cor,
        despesaAtual: d.total,
        despesaAnterior: anterior,
        variacaoPercentual: Number(variacao.toFixed(0)),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const saldoMes = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS saldo
       FROM transacoes
       WHERE status = 'pago' AND data BETWEEN ? AND ?`
    )
    .get(formatarData(inicioMesAtual), formatarData(fimMesAtual)) as { saldo: number };

  return NextResponse.json({
    manejosAtrasados,
    estoqueBaixo,
    alertasCusto,
    saldoMesNegativo: saldoMes.saldo < 0,
    saldoMes: saldoMes.saldo,
  });
}
