import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import { idFuncionarioSessao } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const funcionarioId = idFuncionarioSessao(req);

  if (!funcionarioId) {
    return NextResponse.json(null);
  }

  const funcionario = db
    .prepare("SELECT id, nome, tipo FROM funcionarios WHERE id = ? AND ativo = 1")
    .get(funcionarioId);

  return NextResponse.json(funcionario ?? null);
}
