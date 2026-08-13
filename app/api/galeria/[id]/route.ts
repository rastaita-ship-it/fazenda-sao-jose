import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-galeria";
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
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });
  db.prepare("DELETE FROM registros_campo WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
