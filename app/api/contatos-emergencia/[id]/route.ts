import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-mural";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });
  db.prepare("DELETE FROM contatos_emergencia WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
