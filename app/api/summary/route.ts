import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ResumoFinanceiro } from "@/lib/types";
import { estaLogado } from "@/lib/auth-helpers";
import { SETOR_INVESTIMENTOS_NOME } from "@/lib/financeiro";

/**
 * GET /api/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Defaults to the current month if no range is given.
 * Only counts transactions with status = 'pago' toward totals so that
 * "previsto"/"pendente" entries don't distort the real cash position.
 */
export async function GET(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

  const from = searchParams.get("from") ?? defaultFrom;
  const to = searchParams.get("to") ?? defaultTo;

  const totals = db
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) AS totalReceitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS totalDespesas
      FROM transacoes
      WHERE status = 'pago' AND data BETWEEN ? AND ?
        AND setor_id != (SELECT id FROM setores WHERE nome = ?)
    `
    )
    .get(from, to, SETOR_INVESTIMENTOS_NOME) as { totalReceitas: number; totalDespesas: number };

  const porSetorRaw = db
    .prepare(
      `
      SELECT
        s.id AS setor_id,
        s.nome AS nome,
        s.cor AS cor,
        COALESCE(SUM(CASE WHEN t.tipo = 'receita' THEN t.valor ELSE 0 END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN t.tipo = 'despesa' THEN t.valor ELSE 0 END), 0) AS despesas
      FROM setores s
      LEFT JOIN transacoes t
        ON t.setor_id = s.id AND t.status = 'pago' AND t.data BETWEEN ? AND ?
      WHERE s.ativo = 1 AND s.nome != ?
      GROUP BY s.id
      ORDER BY s.id ASC
    `
    )
    .all(from, to, SETOR_INVESTIMENTOS_NOME) as {
    setor_id: number;
    nome: string;
    cor: string;
    receitas: number;
    despesas: number;
  }[];

  const resumo: ResumoFinanceiro = {
    totalReceitas: totals.totalReceitas,
    totalDespesas: totals.totalDespesas,
    saldo: totals.totalReceitas - totals.totalDespesas,
    porSetor: porSetorRaw.map((s) => ({
      ...s,
      saldo: s.receitas - s.despesas,
    })),
  };

  return NextResponse.json(resumo);
}
