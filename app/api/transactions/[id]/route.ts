import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-custos";
import { ehAdminLogado } from "@/lib/auth-helpers";

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

  const existente = db.prepare("SELECT id FROM transacoes WHERE id = ?").get(id);
  if (!existente) {
    return NextResponse.json({ error: "lancamento nao encontrado" }, { status: 404 });
  }

  db.prepare("DELETE FROM transacoes WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

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
    "setor_id",
    "tipo",
    "categoria",
    "descricao",
    "valor",
    "data",
    "status",
    "classificacao_custo",
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
  db.prepare(`UPDATE transacoes SET ${campos.join(", ")} WHERE id = ?`).run(...valores);

  const atualizado = db
    .prepare(
      `SELECT t.*, s.nome AS setor_nome, s.cor AS setor_cor
       FROM transacoes t JOIN setores s ON s.id = t.setor_id
       WHERE t.id = ?`
    )
    .get(id);

  return NextResponse.json(atualizado);
}
