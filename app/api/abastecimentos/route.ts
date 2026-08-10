import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-abastecimento";
import { ehAdminLogado } from "@/lib/auth-helpers";

interface Abastecimento {
  id: number;
  patrimonio_id: number;
  data: string;
  litros: number;
  valor_total: number | null;
  preco_litro: number | null;
  horimetro_km: number | null;
}

const LIMIAR_DESVIO = 0.2; // 20% de desvio em relacao a media da propria maquina

function calcularMedias(historico: Abastecimento[]) {
  const precos = historico.map((a) => a.preco_litro).filter((v): v is number => v != null);
  const mediaPreco = precos.length ? precos.reduce((s, v) => s + v, 0) / precos.length : null;

  const consumos: number[] = [];
  const ordenado = [...historico].sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id);
  let anterior: Abastecimento | null = null;
  for (const item of ordenado) {
    if (anterior && anterior.horimetro_km != null && item.horimetro_km != null && item.litros > 0) {
      const delta = item.horimetro_km - anterior.horimetro_km;
      if (delta > 0) consumos.push(delta / item.litros);
    }
    if (item.horimetro_km != null) anterior = item;
  }
  const mediaConsumo = consumos.length ? consumos.reduce((s, v) => s + v, 0) / consumos.length : null;

  return { mediaPreco, mediaConsumo };
}

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const patrimonioId = searchParams.get("patrimonio_id");

  let query = `
    SELECT a.*, p.nome AS patrimonio_nome, p.tipo AS patrimonio_tipo
    FROM abastecimentos a
    JOIN patrimonio p ON p.id = a.patrimonio_id
    WHERE 1 = 1
  `;
  const params: (string | number)[] = [];
  if (patrimonioId) {
    query += " AND a.patrimonio_id = ?";
    params.push(Number(patrimonioId));
  }
  query += " ORDER BY a.data DESC, a.id DESC LIMIT 200";

  const historico = db.prepare(query).all(...params) as (Abastecimento & { patrimonio_nome: string; patrimonio_tipo: string })[];

  if (patrimonioId) {
    const { mediaPreco, mediaConsumo } = calcularMedias(historico);
    return NextResponse.json({ itens: historico, media_preco_litro: mediaPreco, media_consumo: mediaConsumo });
  }

  return NextResponse.json({ itens: historico, media_preco_litro: null, media_consumo: null });
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { patrimonio_id, data, litros, valor_total, horimetro_km, local, observacao, criar_lancamento } = body;

  if (!patrimonio_id || !data || !litros) {
    return NextResponse.json({ error: "Campos obrigatorios: patrimonio_id, data, litros" }, { status: 400 });
  }
  const litrosNum = Number(litros);
  if (!(litrosNum > 0)) {
    return NextResponse.json({ error: "litros deve ser maior que zero" }, { status: 400 });
  }

  const maquina = db.prepare("SELECT * FROM patrimonio WHERE id = ?").get(patrimonio_id) as
    | { id: number; nome: string; horimetro_km_atual: number | null }
    | undefined;
  if (!maquina) {
    return NextResponse.json({ error: "maquina nao encontrada" }, { status: 404 });
  }

  const valorTotalNum = valor_total != null && valor_total !== "" ? Number(valor_total) : null;
  const precoLitro = valorTotalNum != null ? valorTotalNum / litrosNum : null;
  const horimetroNum = horimetro_km != null && horimetro_km !== "" ? Number(horimetro_km) : null;

  // Media historica da propria maquina, calculada ANTES de inserir o novo registro,
  // pra comparar o abastecimento novo contra o padrao dela mesma (nao contra outras maquinas).
  const historico = db
    .prepare("SELECT * FROM abastecimentos WHERE patrimonio_id = ?")
    .all(patrimonio_id) as Abastecimento[];
  const { mediaPreco, mediaConsumo } = calcularMedias(historico);

  const alertas: string[] = [];
  if (mediaPreco != null && precoLitro != null && precoLitro > mediaPreco * (1 + LIMIAR_DESVIO)) {
    alertas.push(
      `Preco por litro (R$ ${precoLitro.toFixed(2)}) esta ${Math.round(((precoLitro - mediaPreco) / mediaPreco) * 100)}% acima da media desta maquina (R$ ${mediaPreco.toFixed(2)}).`
    );
  }
  if (mediaConsumo != null && horimetroNum != null) {
    const ultimoComHorimetro = [...historico]
      .filter((a) => a.horimetro_km != null)
      .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)[0];
    if (ultimoComHorimetro && ultimoComHorimetro.horimetro_km != null) {
      const delta = horimetroNum - ultimoComHorimetro.horimetro_km;
      if (delta > 0) {
        const consumoNovo = delta / litrosNum;
        if (consumoNovo < mediaConsumo * (1 - LIMIAR_DESVIO)) {
          alertas.push(
            `Consumo (${consumoNovo.toFixed(2)}/L) esta ${Math.round(((mediaConsumo - consumoNovo) / mediaConsumo) * 100)}% pior que a media desta maquina (${mediaConsumo.toFixed(2)}/L).`
          );
        }
      }
    }
  }

  let transacaoId: number | null = null;

  const executar = db.transaction(() => {
    if (horimetroNum != null && (maquina.horimetro_km_atual == null || horimetroNum > maquina.horimetro_km_atual)) {
      db.prepare("UPDATE patrimonio SET horimetro_km_atual = ? WHERE id = ?").run(horimetroNum, patrimonio_id);
    }

    if (valorTotalNum != null && criar_lancamento !== false) {
      const setorOficina = db.prepare("SELECT id FROM setores WHERE nome = ?").get("Oficina e Manutencao") as
        | { id: number }
        | undefined;
      if (setorOficina) {
        const resultadoTransacao = db
          .prepare(
            `INSERT INTO transacoes (setor_id, tipo, categoria, descricao, valor, data, status, classificacao_custo)
             VALUES (?, 'despesa', 'Combustivel e lubrificantes', ?, ?, ?, 'pago', 'variavel')`
          )
          .run(setorOficina.id, `Abastecimento - ${maquina.nome}`, valorTotalNum, data);
        transacaoId = Number(resultadoTransacao.lastInsertRowid);
      }
    }

    const resultado = db
      .prepare(
        `INSERT INTO abastecimentos (patrimonio_id, data, litros, valor_total, preco_litro, horimetro_km, local, observacao, transacao_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(patrimonio_id, data, litrosNum, valorTotalNum, precoLitro, horimetroNum, local ?? null, observacao ?? null, transacaoId);

    return resultado.lastInsertRowid;
  });

  const novoId = executar();
  const novo = db.prepare("SELECT * FROM abastecimentos WHERE id = ?").get(novoId);

  return NextResponse.json({ ...(novo as object), alertas }, { status: 201 });
}
