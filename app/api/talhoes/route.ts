import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-talhoes";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const setorId = searchParams.get("setor_id");

  let query = `
    SELECT t.*, s.nome AS setor_nome, s.cor AS setor_cor
    FROM talhoes t
    JOIN setores s ON s.id = t.setor_id
    WHERE t.ativo = 1
  `;
  const params: (string | number)[] = [];
  if (setorId) {
    query += " AND t.setor_id = ?";
    params.push(Number(setorId));
  }
  query += " ORDER BY s.nome ASC, t.nome ASC";

  const talhoes = db.prepare(query).all(...params);
  return NextResponse.json(talhoes);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { setor_id, nome, area_hectares, observacao } = body;

  if (!setor_id || !nome) {
    return NextResponse.json(
      { error: "Campos obrigatorios: setor_id, nome" },
      { status: 400 }
    );
  }

  const stmt = db.prepare(`
    INSERT INTO talhoes (setor_id, nome, area_hectares, observacao)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(setor_id, nome, area_hectares ?? null, observacao ?? null);

  const novo = db
    .prepare(
      `SELECT t.*, s.nome AS setor_nome, s.cor AS setor_cor
       FROM talhoes t JOIN setores s ON s.id = t.setor_id
       WHERE t.id = ?`
    )
    .get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
