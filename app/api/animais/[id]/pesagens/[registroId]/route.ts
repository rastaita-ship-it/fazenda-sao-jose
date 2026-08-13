import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-animais";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; registroId: string }> }
) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }
  const { id, registroId } = await params;
  db.prepare("DELETE FROM animais_pesagens WHERE id = ? AND animal_id = ?").run(
    Number(registroId),
    Number(id)
  );
  return NextResponse.json({ ok: true });
}
