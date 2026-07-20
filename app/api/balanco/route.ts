import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-custos";
import "@/lib/db-salario";
import "@/lib/db-patrimonio";

export const dynamic = "force-dynamic";

function diasNoPeriodo(from: string, to: string) {
  const inicio = new Date(from + "T12:00:00");
  const fim = new Date(to + "T12:00:00");
  const diff = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(diff, 1);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;
  const from = searchParams.get("from") ?? defaultFrom;
  const to = searchParams.get("to") ?? defaultTo;
  const dias = diasNoPeriodo(from, to);

  const receitas = db
    .prepare(
      "SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes WHERE tipo = 'receita' AND status = 'pago' AND data BETWEEN ? AND ?"
    )
    .get(from, to) as { total: number };

  const custoFixoLancado = db
    .prepare(
      "SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes WHERE tipo = 'despesa' AND classificacao_custo = 'fixo' AND status = 'pago' AND data BETWEEN ? AND ?"
    )
    .get(from, to) as { total: number };

  const custoVariavelLancado = db
    .prepare(
      "SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes WHERE tipo = 'despesa' AND classificacao_custo = 'variavel' AND status = 'pago' AND data BETWEEN ? AND ?"
    )
    .get(from, to) as { total: number };

  const naoClassificado = db
    .prepare(
      "SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes WHERE tipo = 'despesa' AND classificacao_custo IS NULL AND status = 'pago' AND data BETWEEN ? AND ?"
    )
    .get(from, to) as { total: number };

  const salarios = db
    .prepare(
      "SELECT COALESCE(SUM(salario_mensal), 0) AS total FROM funcionarios WHERE ativo = 1 AND tipo_contrato = 'fixo' AND salario_mensal IS NOT NULL"
    )
    .get() as { total: number };
  const maoDeObraFixa = (salarios.total / 30) * dias;

  const patrimonioAtivo = db
    .prepare(
      "SELECT valor_aquisicao, vida_util_meses FROM patrimonio WHERE status != 'vendido' AND valor_aquisicao IS NOT NULL AND vida_util_meses IS NOT NULL AND vida_util_meses > 0"
    )
    .all() as { valor_aquisicao: number; vida_util_meses: number }[];
  const depreciacaoMensalTotal = patrimonioAtivo.reduce(
    (soma, p) => soma + p.valor_aquisicao / p.vida_util_meses,
    0
  );
  const depreciacaoPeriodo = (depreciacaoMensalTotal / 30) * dias;

  const custoFixoTotal = custoFixoLancado.total + maoDeObraFixa + depreciacaoPeriodo;
  const custoVariavelTotal = custoVariavelLancado.total;
  const custoTotal = custoFixoTotal + custoVariavelTotal + naoClassificado.total;
  const lucro = receitas.total - custoTotal;

  return NextResponse.json({
    periodo: { from, to, dias },
    receitas: receitas.total,
    custoFixoLancado: custoFixoLancado.total,
    maoDeObraFixa: Number(maoDeObraFixa.toFixed(2)),
    depreciacaoPeriodo: Number(depreciacaoPeriodo.toFixed(2)),
    custoFixoTotal: Number(custoFixoTotal.toFixed(2)),
    custoVariavelTotal: Number(custoVariavelTotal.toFixed(2)),
    naoClassificado: naoClassificado.total,
    custoTotal: Number(custoTotal.toFixed(2)),
    lucro: Number(lucro.toFixed(2)),
  });
}
