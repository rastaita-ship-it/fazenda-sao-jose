import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Setor } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const setores = db
    .prepare("SELECT * FROM setores WHERE ativo = 1 ORDER BY id ASC")
    .all() as Setor[];
  return NextResponse.json(setores);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, tipo, cor } = body;

  if (!nome || !tipo) {
    return NextResponse.json(
      { error: "Campos obrigatórios: nome, tipo" },
      { status: 400 }
    );
  }

  try {
    const stmt = db.prepare(
      "INSERT INTO setores (nome, tipo, cor) VALUES (?, ?, ?)"
    );
    const result = stmt.run(nome, tipo, cor ?? "#3f8f34");
    const novo = db
      .prepare("SELECT * FROM setores WHERE id = ?")
      .get(result.lastInsertRowid);
    return NextResponse.json(novo, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Já existe um setor com esse nome." },
      { status: 409 }
    );
  }
}
