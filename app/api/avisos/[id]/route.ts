import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-mural";
import { estaLogado, ehAdminLogado } from "@/lib/auth-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "id invalido" }, { status: 400 });

  const aviso = db.prepare("SELECT autor_id FROM avisos WHERE id = ?").get(id) as
    | { autor_id: number | null }
    | undefined;
  if (!aviso) return NextResponse.json({ error: "Aviso nao encontrado." }, { status: 404 });

  const funcionarioId = Number(req.cookies.get("funcionario_id")?.value);
  const ehAutor = aviso.autor_id != null && aviso.autor_id === funcionarioId;
  if (!ehAutor && !ehAdminLogado(req)) {
    return NextResponse.json({ error: "Sem permissao para excluir este aviso." }, { status: 403 });
  }

  db.prepare("DELETE FROM avisos WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
