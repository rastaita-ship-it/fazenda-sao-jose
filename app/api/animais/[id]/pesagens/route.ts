import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-animais";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { id: idParam } = await params;
  const animalId = Number(idParam);
  if (!animalId) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }

  const body = await req.json();
  const { peso_kg, data, observacao } = body;
  if (!peso_kg || !data) {
    return NextResponse.json({ error: "peso_kg e data sao obrigatorios" }, { status: 400 });
  }

  const result = db
    .prepare("INSERT INTO animais_pesagens (animal_id, peso_kg, data, observacao) VALUES (?, ?, ?, ?)")
    .run(animalId, Number(peso_kg), data, observacao ?? null);

  const novo = db.prepare("SELECT * FROM animais_pesagens WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
