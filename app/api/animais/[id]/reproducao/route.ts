import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-animais";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const animalId = Number(params.id);
  if (!animalId) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }

  const body = await req.json();
  const { tipo, data, parceiro, observacao } = body;
  if (!tipo || !data) {
    return NextResponse.json({ error: "tipo e data sao obrigatorios" }, { status: 400 });
  }
  if (!["cobertura", "prenhez_confirmada", "parto", "desmame"].includes(tipo)) {
    return NextResponse.json({ error: "tipo invalido" }, { status: 400 });
  }

  const result = db
    .prepare(
      "INSERT INTO animais_reproducao (animal_id, tipo, data, parceiro, observacao) VALUES (?, ?, ?, ?, ?)"
    )
    .run(animalId, tipo, data, parceiro ?? null, observacao ?? null);

  const novo = db.prepare("SELECT * FROM animais_reproducao WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
