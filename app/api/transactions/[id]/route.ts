import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-custos";
import { talhaoExiste } from "@/lib/db-talhoes";
import { ehAdminLogado } from "@/lib/auth-helpers";
import { lerCorpoJson } from "@/lib/api";

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

  const existente = db.prepare("SELECT id FROM transacoes WHERE id = ?").get(id);
  if (!existente) {
    return NextResponse.json({ error: "lancamento nao encontrado" }, { status: 404 });
  }

  db.prepare("DELETE FROM transacoes WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
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

  const resultado = await lerCorpoJson<Record<string, string | number | null>>(req);
  if (!resultado.ok) return resultado.resposta;
  const body = resultado.body;
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
    "talhao_id",
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
  if (body.talhao_id != null && !talhaoExiste(Number(body.talhao_id))) {
    return NextResponse.json({ error: "talhao invalido" }, { status: 400 });
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
