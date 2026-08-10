import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-animais";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; registroId: string } }
) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }
  db.prepare("DELETE FROM animais_vacinas WHERE id = ? AND animal_id = ?").run(
    Number(params.registroId),
    Number(params.id)
  );
  return NextResponse.json({ ok: true });
}
