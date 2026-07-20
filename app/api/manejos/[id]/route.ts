import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-manejo";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }

  const body = await req.json();
  const campos: string[] = [];
  const valores: (string | number | null)[] = [];

  const permitidos = [
    "status",
    "data_realizada",
    "data_planejada",
    "funcionario_id",
    "observacao",
    "atividade_nome",
  ];
  for (const campo of permitidos) {
    if (campo in body) {
      campos.push(`${campo} = ?`);
      valores.push(body[campo]);
    }
  }

  if (campos.length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });
  }

  valores.push(id);
  db.prepare(`UPDATE manejos SET ${campos.join(", ")} WHERE id = ?`).run(...valores);

  const atualizado = db.prepare("SELECT * FROM manejos WHERE id = ?").get(id);
  return NextResponse.json(atualizado);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  db.prepare("DELETE FROM manejos WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
