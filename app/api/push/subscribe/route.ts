import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-notificacoes";
import { estaLogado } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }
  const funcionarioId = Number(req.cookies.get("funcionario_id")?.value);

  const body = await req.json();
  const { endpoint, keys } = body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "inscricao invalida" }, { status: 400 });
  }

  const existente = db.prepare("SELECT funcionario_id FROM push_subscriptions WHERE endpoint = ?").get(endpoint) as
    | { funcionario_id: number }
    | undefined;

  if (existente && existente.funcionario_id !== funcionarioId) {
    return NextResponse.json(
      { error: "Este dispositivo ja tem notificacoes ativas para outro usuario. Peca pra ele desativar primeiro." },
      { status: 409 }
    );
  }

  db.prepare(
    `INSERT INTO push_subscriptions (funcionario_id, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth
     WHERE push_subscriptions.funcionario_id = excluded.funcionario_id`
  ).run(funcionarioId, endpoint, keys.p256dh, keys.auth);

  return NextResponse.json({ ok: true });
}
