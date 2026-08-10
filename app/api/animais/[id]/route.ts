import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-animais";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function GET(
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

  const animal = db
    .prepare(
      `SELECT a.*, s.nome AS setor_nome, s.cor AS setor_cor, t.nome AS talhao_nome
       FROM animais a JOIN setores s ON s.id = a.setor_id
       LEFT JOIN talhoes t ON t.id = a.talhao_id
       WHERE a.id = ?`
    )
    .get(id);
  if (!animal) {
    return NextResponse.json({ error: "animal nao encontrado" }, { status: 404 });
  }

  const pesagens = db
    .prepare("SELECT * FROM animais_pesagens WHERE animal_id = ? ORDER BY data DESC, id DESC")
    .all(id);
  const vacinas = db
    .prepare("SELECT * FROM animais_vacinas WHERE animal_id = ? ORDER BY data_aplicacao DESC, id DESC")
    .all(id);
  const reproducao = db
    .prepare("SELECT * FROM animais_reproducao WHERE animal_id = ? ORDER BY data DESC, id DESC")
    .all(id);

  return NextResponse.json({ ...(animal as object), pesagens, vacinas, reproducao });
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
    "talhao_id",
    "identificacao",
    "nome",
    "especie",
    "sexo",
    "data_nascimento",
    "raca",
    "status",
    "observacao",
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
  if ("status" in body && !["ativo", "vendido", "morto"].includes(body.status)) {
    return NextResponse.json({ error: "status invalido" }, { status: 400 });
  }

  valores.push(id);
  db.prepare(`UPDATE animais SET ${campos.join(", ")} WHERE id = ?`).run(...valores);

  const atualizado = db
    .prepare(
      `SELECT a.*, s.nome AS setor_nome, s.cor AS setor_cor, t.nome AS talhao_nome
       FROM animais a JOIN setores s ON s.id = a.setor_id
       LEFT JOIN talhoes t ON t.id = a.talhao_id
       WHERE a.id = ?`
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
  db.prepare("DELETE FROM animais WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
