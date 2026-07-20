import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-area";
import "@/lib/db-estoque";

export const dynamic = "force-dynamic";

interface SetorRow {
  id: number;
  nome: string;
  cor: string;
  area_hectares: number | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;
  const from = searchParams.get("from") ?? defaultFrom;
  const to = searchParams.get("to") ?? defaultTo;

  const setores = db
    .prepare("SELECT id, nome, cor, area_hectares FROM setores WHERE ativo = 1")
    .all() as SetorRow[];

  const resultado = setores.map((setor) => {
    const receitas = db
      .prepare(
        "SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes WHERE setor_id = ? AND tipo = 'receita' AND status = 'pago' AND data BETWEEN ? AND ?"
      )
      .get(setor.id, from, to) as { total: number };

    const despesas = db
      .prepare(
        "SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes WHERE setor_id = ? AND tipo = 'despesa' AND status = 'pago' AND data BETWEEN ? AND ?"
      )
      .get(setor.id, from, to) as { total: number };

    const produzido = db
      .prepare(
        `SELECT p.unidade, COALESCE(SUM(m.quantidade), 0) AS total
         FROM movimentacoes_producao m
         JOIN estoque_producao p ON p.id = m.produto_id
         WHERE p.setor_id = ? AND m.tipo = 'entrada' AND m.data BETWEEN ? AND ?
         GROUP BY p.unidade`
      )
      .all(setor.id, from, to) as { unidade: string; total: number }[];

    const totalProduzido = produzido.reduce((soma, p) => soma + p.total, 0);
    const unidadePrincipal = produzido[0]?.unidade ?? null;

    const produtividade =
      setor.area_hectares && setor.area_hectares > 0 ? totalProduzido / setor.area_hectares : null;

    const custoPorUnidade = totalProduzido > 0 ? despesas.total / totalProduzido : null;
    const lucro = receitas.total - despesas.total;

    return {
      setor_id: setor.id,
      nome: setor.nome,
      cor: setor.cor,
      area_hectares: setor.area_hectares,
      receitas: receitas.total,
      despesas: despesas.total,
      lucro,
      totalProduzido,
      unidadePrincipal,
      produtividade: produtividade != null ? Number(produtividade.toFixed(2)) : null,
      custoPorUnidade: custoPorUnidade != null ? Number(custoPorUnidade.toFixed(2)) : null,
    };
  });

  return NextResponse.json({ periodo: { from, to }, setores: resultado });
}
