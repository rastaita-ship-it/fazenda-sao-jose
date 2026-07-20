import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-manejo";

/**
 * GET /api/activity-templates?setor_tipo=cafe
 * Lista as atividades padrao de um tipo de setor (para os botoes de escolha rapida).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const setorTipo = searchParams.get("setor_tipo");

  let query = "SELECT * FROM atividades_padrao WHERE 1 = 1";
  const params: string[] = [];

  if (setorTipo) {
    query += " AND setor_tipo = ?";
    params.push(setorTipo);
  }

  query +=
" ORDER BY nome ASC";

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}
