import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-area";
import "@/lib/db-estoque";
import { ehAdminLogado } from "@/lib/auth-helpers";

interface SetorRow {
  id: number;
  nome: string;
  cor: string;
  area_hectares: number | null;
}

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const setores = db
    .prepare("SELECT id, nome, cor, area_hectares FROM setores WHERE ativo = 1")
    .all() as SetorRow[];

  const resultado = setores.map((setor) => {
    const producaoPorAno = db
      .prepare(
        `SELECT strftime('%Y', m.data) AS ano, p.unidade, SUM(m.quantidade) AS total
         FROM movimentacoes_producao m
         JOIN estoque_producao p ON p.id = m.produto_id
         WHERE p.setor_id = ? AND m.tipo = 'entrada'
         GROUP BY ano, p.unidade
         ORDER BY ano ASC`
      )
      .all(setor.id) as { ano: string; unidade: string; total: number }[];

    const anoAtual = new Date().getFullYear().toString();
    const anosAnteriores = producaoPorAno.filter((p) => p.ano !== anoAtual);

    if (
      anosAnteriores.length === 0 ||
      !setor.area_hectares ||
      setor.area_hectares <= 0
    ) {
      return {
        setor_id: setor.id,
        nome: setor.nome,
        cor: setor.cor,
        temHistorico: false,
        anosDisponiveis: anosAnteriores.map((a) => a.ano),
        projecao: null,
        unidade: null,
      };
    }

    const totalHistorico = anosAnteriores.reduce((soma, a) => soma + a.total, 0);
    const anosUnicos = new Set(anosAnteriores.map((a) => a.ano)).size;
    const mediaAnual = totalHistorico / anosUnicos;
    const produtividadeMediaPorHa = mediaAnual / setor.area_hectares;
    const projecao = produtividadeMediaPorHa * setor.area_hectares;
    const unidade = anosAnteriores[anosAnteriores.length - 1]?.unidade ?? null;

    return {
      setor_id: setor.id,
      nome: setor.nome,
      cor: setor.cor,
      temHistorico: true,
      anosDisponiveis: Array.from(new Set(anosAnteriores.map((a) => a.ano))),
      projecao: Number(projecao.toFixed(1)),
      produtividadeMediaPorHa: Number(produtividadeMediaPorHa.toFixed(2)),
      unidade,
    };
  });

  return NextResponse.json(resultado);
}
