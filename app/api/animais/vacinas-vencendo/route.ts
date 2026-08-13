import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-animais";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const vacinas = db
    .prepare(
      `SELECT v.id, v.produto, v.proxima_dose, a.id AS animal_id, a.identificacao, a.nome
       FROM animais_vacinas v
       JOIN animais a ON a.id = v.animal_id
       WHERE a.status = 'ativo' AND v.proxima_dose IS NOT NULL
         AND v.proxima_dose <= date('now', '+30 days')
       ORDER BY v.proxima_dose ASC`
    )
    .all();

  return NextResponse.json(vacinas);
}
