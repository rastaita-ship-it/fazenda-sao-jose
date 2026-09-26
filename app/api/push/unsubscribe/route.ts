import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-notificacoes";
import { idFuncionarioSessao } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  const funcionarioId = idFuncionarioSessao(req);
  if (!funcionarioId) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint } = body ?? {};
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint obrigatorio" }, { status: 400 });
  }

  db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND funcionario_id = ?").run(endpoint, funcionarioId);
  return NextResponse.json({ ok: true });
}
