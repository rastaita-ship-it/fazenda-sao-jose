import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const funcionarioId = req.cookies.get("funcionario_id")?.value;

  if (!funcionarioId) {
    return NextResponse.json(null);
  }

  const funcionario = db
    .prepare("SELECT id, nome, tipo FROM funcionarios WHERE id = ? AND ativo = 1")
    .get(funcionarioId);

  return NextResponse.json(funcionario ?? null);
}
