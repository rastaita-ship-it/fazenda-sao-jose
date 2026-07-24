import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ehAdminLogado } from "@/lib/auth-helpers";
import { Setor } from "@/lib/types";

export async function GET() {
  const setores = db
    .prepare("SELECT * FROM setores WHERE ativo = 1 ORDER BY id ASC")
    .all() as Setor[];
  return NextResponse.json(setores);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { nome, tipo, cor, area_hectares } = body;

  if (!nome || !tipo) {
    return NextResponse.json(
      { error: "Campos obrigatorios: nome, tipo" },
      { status: 400 }
    );
  }

  try {
    const stmt = db.prepare(
      "INSERT INTO setores (nome, tipo, cor, area_hectares) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(nome, tipo, cor ?? "#3f8f34", area_hectares ?? null);
    const novo = db
      .prepare("SELECT * FROM setores WHERE id = ?")
      .get(result.lastInsertRowid);
    return NextResponse.json(novo, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Ja existe um setor com esse nome." },
      { status: 409 }
    );
  }
}
