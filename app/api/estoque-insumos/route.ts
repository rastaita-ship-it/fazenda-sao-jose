import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-estoque";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const itens = db
    .prepare(
      `SELECT i.*, s.nome AS setor_nome, s.cor AS setor_cor
       FROM estoque_insumos i
       LEFT JOIN setores s ON s.id = i.setor_id
       ORDER BY i.nome ASC`
    )
    .all();
  return NextResponse.json(itens);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { nome, categoria, unidade, quantidade_atual, quantidade_minima, custo_unitario, setor_id, observacao } = body;

  if (!nome || !categoria || !unidade) {
    return NextResponse.json({ error: "nome, categoria e unidade sao obrigatorios" }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO estoque_insumos (nome, categoria, unidade, quantidade_atual, quantidade_minima, custo_unitario, setor_id, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    nome,
    categoria,
    unidade,
    quantidade_atual ?? 0,
    quantidade_minima ?? null,
    custo_unitario ?? null,
    setor_id ?? null,
    observacao ?? null
  );

  const novo = db.prepare("SELECT * FROM estoque_insumos WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
