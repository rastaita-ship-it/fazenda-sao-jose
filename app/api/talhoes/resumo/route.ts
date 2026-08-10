import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-talhoes";
import { ehAdminLogado } from "@/lib/auth-helpers";

interface TalhaoBase {
  id: number;
  setor_id: number;
  nome: string;
  area_hectares: number | null;
  observacao: string | null;
  setor_nome: string;
  setor_cor: string;
  receitas: number;
  despesas: number;
}

interface ProducaoPorUnidade {
  talhao_id: number;
  unidade: string;
  total: number;
}

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const talhoes = db
    .prepare(
      `SELECT
         t.id, t.setor_id, t.nome, t.area_hectares, t.observacao,
         s.nome AS setor_nome, s.cor AS setor_cor,
         COALESCE((SELECT SUM(valor) FROM transacoes WHERE talhao_id = t.id AND tipo = 'receita'), 0) AS receitas,
         COALESCE((SELECT SUM(valor) FROM transacoes WHERE talhao_id = t.id AND tipo = 'despesa'), 0) AS despesas
       FROM talhoes t
       JOIN setores s ON s.id = t.setor_id
       WHERE t.ativo = 1
       ORDER BY s.nome ASC, t.nome ASC`
    )
    .all() as TalhaoBase[];

  // Producao agrupada por unidade: um talhao pode ter mais de um produto
  // (ex: "sacas" de cafe e "kg" de outro cultivo), entao nao da pra somar tudo junto.
  const producao = db
    .prepare(
      `SELECT mp.talhao_id AS talhao_id, ep.unidade AS unidade, SUM(mp.quantidade) AS total
       FROM movimentacoes_producao mp
       JOIN estoque_producao ep ON ep.id = mp.produto_id
       WHERE mp.tipo = 'entrada' AND mp.talhao_id IS NOT NULL
       GROUP BY mp.talhao_id, ep.unidade`
    )
    .all() as ProducaoPorUnidade[];

  const producaoPorTalhao = new Map<number, ProducaoPorUnidade[]>();
  for (const p of producao) {
    const lista = producaoPorTalhao.get(p.talhao_id) ?? [];
    lista.push(p);
    producaoPorTalhao.set(p.talhao_id, lista);
  }

  const resultado = talhoes.map((t) => {
    const producaoTalhao = (producaoPorTalhao.get(t.id) ?? []).map((p) => ({
      unidade: p.unidade,
      total: p.total,
      por_hectare: t.area_hectares ? p.total / t.area_hectares : null,
    }));

    return {
      ...t,
      saldo: t.receitas - t.despesas,
      producao: producaoTalhao,
    };
  });

  return NextResponse.json(resultado);
}
