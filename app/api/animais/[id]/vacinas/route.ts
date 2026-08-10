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
  const { produto, data_aplicacao, proxima_dose, observacao } = body;
  if (!produto || !data_aplicacao) {
    return NextResponse.json({ error: "produto e data_aplicacao sao obrigatorios" }, { status: 400 });
  }

  const result = db
    .prepare(
      "INSERT INTO animais_vacinas (animal_id, produto, data_aplicacao, proxima_dose, observacao) VALUES (?, ?, ?, ?, ?)"
    )
    .run(animalId, produto, data_aplicacao, proxima_dose ?? null, observacao ?? null);

  const novo = db.prepare("SELECT * FROM animais_vacinas WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
