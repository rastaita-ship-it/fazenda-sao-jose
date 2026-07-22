import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-mural";

export async function GET() {
  const itens = db.prepare("SELECT * FROM contatos_emergencia ORDER BY categoria, nome").all();
  return NextResponse.json(itens);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, categoria, telefone, observacao } = body;
  if (!nome || !categoria || !telefone) {
    return NextResponse.json({ error: "nome, categoria e telefone sao obrigatorios" }, { status: 400 });
  }
  const result = db
    .prepare("INSERT INTO contatos_emergencia (nome, categoria, telefone, observacao) VALUES (?, ?, ?, ?)")
    .run(nome, categoria, telefone, observacao ?? null);
  const novo = db.prepare("SELECT * FROM contatos_emergencia WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
