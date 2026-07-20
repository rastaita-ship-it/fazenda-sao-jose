import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-estoque";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const insumoId = searchParams.get("insumo_id");

  let query = "SELECT * FROM movimentacoes_insumo WHERE 1 = 1";
  const params: (string | number)[] = [];
  if (insumoId) {
    query += " AND insumo_id = ?";
    params.push(Number(insumoId));
  }
  query += " ORDER BY data DESC, id DESC LIMIT 100";

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { insumo_id, tipo, quantidade, data, descricao, custo_total } = body;

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
    | { quantidade_atual: number }
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

  const transacao = db.transaction(() => {
    db.prepare(
      "INSERT INTO movimentacoes_insumo (insumo_id, tipo, quantidade, data, descricao, custo_total) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(insumo_id, tipo, quantidadeNum, data, descricao ?? null, custo_total ?? null);

    const delta = tipo === "entrada" ? quantidadeNum : -quantidadeNum;
    db.prepare("UPDATE estoque_insumos SET quantidade_atual = quantidade_atual + ? WHERE id = ?").run(
      delta,
      insumo_id
    );
  });
  transacao();

  const atualizado = db.prepare("SELECT * FROM estoque_insumos WHERE id = ?").get(insumo_id);
  return NextResponse.json(atualizado, { status: 201 });
}
