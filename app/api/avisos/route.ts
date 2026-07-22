import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-mural";

export async function GET() {
  const itens = db.prepare("SELECT * FROM avisos ORDER BY id DESC LIMIT 50").all();
  return NextResponse.json(itens);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { autor_id, autor_nome, texto } = body;
  if (!autor_nome || !texto || !texto.trim()) {
    return NextResponse.json({ error: "autor_nome e texto sao obrigatorios" }, { status: 400 });
  }
  const result = db
    .prepare("INSERT INTO avisos (autor_id, autor_nome, texto) VALUES (?, ?, ?)")
    .run(autor_id ?? null, autor_nome, texto.trim());
  const novo = db.prepare("SELECT * FROM avisos WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
