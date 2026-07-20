import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-estoque";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const produtoId = searchParams.get("produto_id");

  let query = "SELECT * FROM movimentacoes_producao WHERE 1 = 1";
  const params: (string | number)[] = [];
  if (produtoId) {
    query += " AND produto_id = ?";
    params.push(Number(produtoId));
  }
  query += " ORDER BY data DESC, id DESC LIMIT 100";

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { produto_id, tipo, quantidade, data, descricao, transacao_id } = body;

  if (!produto_id || !tipo || !quantidade || !data) {
    return NextResponse.json(
      { error: "produto_id, tipo, quantidade e data sao obrigatorios" },
      { status: 400 }
    );
  }
  if (!["entrada", "saida"].includes(tipo)) {
    return NextResponse.json({ error: "tipo invalido" }, { status: 400 });
  }

  const produto = db.prepare("SELECT * FROM estoque_producao WHERE id = ?").get(produto_id) as
    | { quantidade_atual: number }
    | undefined;
  if (!produto) {
    return NextResponse.json({ error: "produto nao encontrado" }, { status: 404 });
  }

  const quantidadeNum = Number(quantidade);
  if (tipo === "saida" && quantidadeNum > produto.quantidade_atual) {
    return NextResponse.json(
      { error: `Estoque insuficiente. Disponivel: ${produto.quantidade_atual}` },
      { status: 400 }
    );
  }

  const transacaoDb = db.transaction(() => {
    db.prepare(
      "INSERT INTO movimentacoes_producao (produto_id, tipo, quantidade, data, descricao, transacao_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(produto_id, tipo, quantidadeNum, data, descricao ?? null, transacao_id ?? null);

    const delta = tipo === "entrada" ? quantidadeNum : -quantidadeNum;
    db.prepare("UPDATE estoque_producao SET quantidade_atual = quantidade_atual + ? WHERE id = ?").run(
      delta,
      produto_id
    );
  });
  transacaoDb();

  const atualizado = db.prepare("SELECT * FROM estoque_producao WHERE id = ?").get(produto_id);
  return NextResponse.json(atualizado, { status: 201 });
}
