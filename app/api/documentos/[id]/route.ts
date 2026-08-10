import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-documentos";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }

  const body = await req.json();
  const campos: string[] = [];
  const valores: (string | number | null)[] = [];

  const permitidos = [
    "tipo",
    "titulo",
    "patrimonio_id",
    "funcionario_id",
    "numero_documento",
    "data_emissao",
    "data_vencimento",
    "observacao",
    "status",
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
  if ("status" in body && !["ativo", "arquivado"].includes(body.status)) {
    return NextResponse.json({ error: "status invalido" }, { status: 400 });
  }

  valores.push(id);
  db.prepare(`UPDATE documentos SET ${campos.join(", ")} WHERE id = ?`).run(...valores);

  const atualizado = db
    .prepare(
      `SELECT d.*, p.nome AS patrimonio_nome, f.nome AS funcionario_nome
       FROM documentos d
       LEFT JOIN patrimonio p ON p.id = d.patrimonio_id
       LEFT JOIN funcionarios f ON f.id = d.funcionario_id
       WHERE d.id = ?`
    )
    .get(id);
  return NextResponse.json(atualizado);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }
  db.prepare("DELETE FROM documentos WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
