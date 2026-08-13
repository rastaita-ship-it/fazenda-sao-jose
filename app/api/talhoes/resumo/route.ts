import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-talhoes";
import "@/lib/db-animais";
import { ehAdminLogado } from "@/lib/auth-helpers";

/** Peso de referencia (kg) de 1 Unidade Animal, padrao zootecnico usado no calculo de lotacao. */
const KG_POR_UNIDADE_ANIMAL = 450;

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

interface PesoPorTalhao {
  talhao_id: number;
  qtd_animais_pesados: number;
  peso_total_kg: number;
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

  // Lotacao animal (UA/ha): soma o peso mais recente de cada animal ativo
  // do talhao (uma pesagem por animal, a mais atual) e converte pra
  // Unidade Animal (450kg = 1 UA), padrao zootecnico de comparacao entre
  // especies/pesos diferentes.
  const pesosPorTalhao = db
    .prepare(
      `SELECT
         a.talhao_id AS talhao_id,
         COUNT(*) AS qtd_animais_pesados,
         SUM(ultima.peso_kg) AS peso_total_kg
       FROM animais a
       JOIN (
         SELECT p.animal_id, p.peso_kg
         FROM animais_pesagens p
         WHERE p.data = (
           SELECT MAX(p2.data) FROM animais_pesagens p2 WHERE p2.animal_id = p.animal_id
         )
         GROUP BY p.animal_id
       ) ultima ON ultima.animal_id = a.id
       WHERE a.status = 'ativo' AND a.talhao_id IS NOT NULL
       GROUP BY a.talhao_id`
    )
    .all() as PesoPorTalhao[];
  const pesoPorTalhaoMap = new Map(pesosPorTalhao.map((p) => [p.talhao_id, p]));

  const qtdAnimaisPorTalhao = db
    .prepare(
      `SELECT talhao_id, COUNT(*) AS total
       FROM animais
       WHERE status = 'ativo' AND talhao_id IS NOT NULL
       GROUP BY talhao_id`
    )
    .all() as { talhao_id: number; total: number }[];
  const qtdAnimaisMap = new Map(qtdAnimaisPorTalhao.map((q) => [q.talhao_id, q.total]));

  const resultado = talhoes.map((t) => {
    const producaoTalhao = (producaoPorTalhao.get(t.id) ?? []).map((p) => ({
      unidade: p.unidade,
      total: p.total,
      por_hectare: t.area_hectares ? p.total / t.area_hectares : null,
    }));

    const pesoInfo = pesoPorTalhaoMap.get(t.id);
    const lotacaoUaHa =
      t.area_hectares && pesoInfo
        ? pesoInfo.peso_total_kg / KG_POR_UNIDADE_ANIMAL / t.area_hectares
        : null;

    return {
      ...t,
      saldo: t.receitas - t.despesas,
      producao: producaoTalhao,
      lotacao_ua_ha: lotacaoUaHa,
      qtd_animais_pesados: pesoInfo?.qtd_animais_pesados ?? 0,
      qtd_animais_total: qtdAnimaisMap.get(t.id) ?? 0,
    };
  });

  return NextResponse.json(resultado);
}
