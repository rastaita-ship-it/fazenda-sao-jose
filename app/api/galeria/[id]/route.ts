import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-galeria";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });
  db.prepare("DELETE FROM registros_campo WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
