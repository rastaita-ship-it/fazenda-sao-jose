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
      `SELECT p.*, s.nome AS setor_nome, s.cor AS setor_cor
       FROM estoque_producao p
       LEFT JOIN setores s ON s.id = p.setor_id
       ORDER BY p.produto ASC`
    )
    .all();
  return NextResponse.json(itens);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { produto, setor_id, unidade, quantidade_atual, local_armazenamento, observacao } = body;

  if (!produto || !unidade) {
    return NextResponse.json({ error: "produto e unidade sao obrigatorios" }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO estoque_producao (produto, setor_id, unidade, quantidade_atual, local_armazenamento, observacao)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    produto,
    setor_id ?? null,
    unidade,
    quantidade_atual ?? 0,
    local_armazenamento ?? null,
    observacao ?? null
  );

  const novo = db.prepare("SELECT * FROM estoque_producao WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
