import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ehAdminLogado } from "@/lib/auth-helpers";
import { SETOR_INVESTIMENTOS_NOME } from "@/lib/financeiro";

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const linhas = db
    .prepare(
      `SELECT
        strftime('%Y-%m', data) AS mes,
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor ELSE 0 END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor ELSE 0 END), 0) AS despesas
      FROM transacoes
      WHERE data >= date('now', '-12 months')
        AND setor_id != (SELECT id FROM setores WHERE nome = ?)
      GROUP BY mes
      ORDER BY mes ASC`
    )
    .all(SETOR_INVESTIMENTOS_NOME) as { mes: string; receitas: number; despesas: number }[];

  const resultado = linhas.map((l) => ({
    mes: l.mes,
    receitas: l.receitas,
    despesas: l.despesas,
    lucro: Number((l.receitas - l.despesas).toFixed(2)),
  }));

  return NextResponse.json(resultado);
}
