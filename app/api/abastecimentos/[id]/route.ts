import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-abastecimento";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }

  const existente = db.prepare("SELECT transacao_id FROM abastecimentos WHERE id = ?").get(id) as
    | { transacao_id: number | null }
    | undefined;
  if (!existente) {
    return NextResponse.json({ error: "abastecimento nao encontrado" }, { status: 404 });
  }

  const executar = db.transaction(() => {
    db.prepare("DELETE FROM abastecimentos WHERE id = ?").run(id);
    if (existente.transacao_id) {
      db.prepare("DELETE FROM transacoes WHERE id = ?").run(existente.transacao_id);
    }
  });
  executar();

  return NextResponse.json({ ok: true });
}
