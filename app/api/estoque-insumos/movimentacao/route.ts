import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-estoque";
import "@/lib/db-historico-precos";
import "@/lib/db-estoque-rastreamento";
import "@/lib/db-custos";
import { ehAdminLogado } from "@/lib/auth-helpers";
import { enviarParaAdmins } from "@/lib/notificacoes";

const ROTULO_CATEGORIA: Record<string, string> = {
  fertilizante: "Fertilizante",
  semente: "Semente",
  defensivo: "Defensivo",
  racao: "Racao",
  medicamento: "Medicamento",
  combustivel: "Combustivel",
  outro: "Outro",
};

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const insumoId = searchParams.get("insumo_id");

  let query = `
    SELECT m.*, f.nome AS funcionario_nome, t.nome AS talhao_nome
    FROM movimentacoes_insumo m
    LEFT JOIN funcionarios f ON f.id = m.funcionario_id
    LEFT JOIN talhoes t ON t.id = m.talhao_id
    WHERE 1 = 1
  `;
  const params: (string | number)[] = [];
  if (insumoId) {
    query += " AND m.insumo_id = ?";
    params.push(Number(insumoId));
  }
  query += " ORDER BY m.data DESC, m.id DESC LIMIT 100";

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const {
    insumo_id,
    tipo,
    quantidade,
    data,
    descricao,
    custo_total,
    fornecedor,
    criar_lancamento,
    funcionario_id,
    finalidade,
    talhao_id,
  } = body;

  if (!insumo_id || !tipo || !quantidade || !data) {
    return NextResponse.json(
      { error: "insumo_id, tipo, quantidade e data sao obrigatorios" },
      { status: 400 }
    );
  }
  if (!["entrada", "saida"].includes(tipo)) {
    return NextResponse.json({ error: "tipo invalido" }, { status: 400 });
  }

  const insumo = db.prepare("SELECT * FROM estoque_insumos WHERE id = ?").get(insumo_id) as
    | {
        nome: string;
        categoria: string;
        unidade: string;
        quantidade_atual: number;
        quantidade_minima: number | null;
        setor_id: number | null;
      }
    | undefined;
  if (!insumo) {
    return NextResponse.json({ error: "insumo nao encontrado" }, { status: 404 });
  }

  const quantidadeNum = Number(quantidade);
  if (tipo === "saida" && quantidadeNum > insumo.quantidade_atual) {
    return NextResponse.json(
      { error: `Estoque insuficiente. Disponivel: ${insumo.quantidade_atual}` },
      { status: 400 }
    );
  }

  const custoTotalNum = custo_total != null && custo_total !== "" ? Number(custo_total) : null;
  const precoUnitario = custoTotalNum != null ? custoTotalNum / quantidadeNum : null;

  let transacaoId: number | null = null;

  const transacao = db.transaction(() => {
    // Compra de insumo com custo informado gera despesa automatica no fluxo
    // de caixa, mesmo padrao ja usado em abastecimentos de combustivel.
    if (tipo === "entrada" && custoTotalNum != null && criar_lancamento !== false) {
      let setorId = insumo.setor_id;
      if (!setorId) {
        const setorOficina = db.prepare("SELECT id FROM setores WHERE nome = ?").get("Oficina e Manutencao") as
          | { id: number }
          | undefined;
        setorId = setorOficina?.id ?? null;
      }
      if (setorId) {
        const categoriaRotulo = ROTULO_CATEGORIA[insumo.categoria] ?? insumo.categoria;
        const resultadoTransacao = db
          .prepare(
            `INSERT INTO transacoes (setor_id, tipo, categoria, descricao, valor, data, status, classificacao_custo)
             VALUES (?, 'despesa', ?, ?, ?, ?, 'pago', 'variavel')`
          )
          .run(
            setorId,
            categoriaRotulo,
            `Compra de insumo - ${insumo.nome} (${quantidadeNum} ${insumo.unidade})`,
            custoTotalNum,
            data
          );
        transacaoId = Number(resultadoTransacao.lastInsertRowid);
      }
    }

    db.prepare(
      `INSERT INTO movimentacoes_insumo
         (insumo_id, tipo, quantidade, data, descricao, custo_total, fornecedor, preco_unitario,
          transacao_id, funcionario_id, finalidade, talhao_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      insumo_id,
      tipo,
      quantidadeNum,
      data,
      descricao ?? null,
      custoTotalNum,
      fornecedor ?? null,
      precoUnitario,
      transacaoId,
      tipo === "saida" ? funcionario_id ?? null : null,
      tipo === "saida" ? finalidade ?? null : null,
      tipo === "saida" ? talhao_id ?? null : null
    );

    const delta = tipo === "entrada" ? quantidadeNum : -quantidadeNum;
    db.prepare("UPDATE estoque_insumos SET quantidade_atual = quantidade_atual + ? WHERE id = ?").run(
      delta,
      insumo_id
    );

    if (tipo === "entrada" && precoUnitario != null) {
      db.prepare("UPDATE estoque_insumos SET custo_unitario = ? WHERE id = ?").run(precoUnitario, insumo_id);
    }
  });
  transacao();

  const atualizado = db.prepare("SELECT * FROM estoque_insumos WHERE id = ?").get(insumo_id) as {
    quantidade_atual: number;
  };

  const antesEstavaAcimaDoMinimo = insumo.quantidade_minima == null || insumo.quantidade_atual > insumo.quantidade_minima;
  const agoraEstaNoOuAbaixoDoMinimo =
    insumo.quantidade_minima != null && atualizado.quantidade_atual <= insumo.quantidade_minima;
  if (tipo === "saida" && antesEstavaAcimaDoMinimo && agoraEstaNoOuAbaixoDoMinimo) {
    enviarParaAdmins({
      titulo: `Estoque baixo: ${insumo.nome}`,
      corpo: `Restam ${atualizado.quantidade_atual} ${insumo.unidade} (minimo: ${insumo.quantidade_minima}).`,
      url: "/estoque",
    }).catch((e) => console.error("Falha ao notificar estoque baixo:", e));
  }

  return NextResponse.json(atualizado, { status: 201 });
}
