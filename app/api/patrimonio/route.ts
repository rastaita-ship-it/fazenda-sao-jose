import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-patrimonio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");

  let query = "SELECT * FROM patrimonio WHERE status != 'vendido'";
  const params: string[] = [];
  if (tipo) {
    query += " AND tipo = ?";
    params.push(tipo);
  }
  query += " ORDER BY nome ASC";

  const itens = db.prepare(query).all(...params);
  return NextResponse.json(itens);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nome,
    tipo,
    identificador,
    data_aquisicao,
    valor_aquisicao,
    vida_util_meses,
    horimetro_km_atual,
    observacao,
  } = body;

  if (!nome || !tipo) {
    return NextResponse.json({ error: "nome e tipo sao obrigatorios" }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO patrimonio (nome, tipo, identificador, data_aquisicao, valor_aquisicao, vida_util_meses, horimetro_km_atual, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    nome,
    tipo,
    identificador ?? null,
    data_aquisicao ?? null,
    valor_aquisicao ?? null,
    vida_util_meses ?? null,
    horimetro_km_atual ?? null,
    observacao ?? null
  );

  const novo = db.prepare("SELECT * FROM patrimonio WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
