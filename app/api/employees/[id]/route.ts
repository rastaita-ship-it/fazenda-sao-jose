import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import "@/lib/db-salario";

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

  const permitidos = ["nome", "funcao", "tipo", "tipo_contrato", "salario_mensal"];
  for (const campo of permitidos) {
    if (campo in body) {
      campos.push(`${campo} = ?`);
      valores.push(body[campo]);
    }
  }

  if (body.pin) {
    if (!/^[0-9]{4}$/.test(body.pin)) {
      return NextResponse.json({ error: "PIN deve ter exatamente 4 numeros." }, { status: 400 });
    }
    const pinEmUso = db
      .prepare("SELECT id FROM funcionarios WHERE pin = ? AND ativo = 1 AND id != ?")
      .get(body.pin, id);
    if (pinEmUso) {
      return NextResponse.json({ error: "Esse PIN ja esta em uso por outro funcionario." }, { status: 409 });
    }
    campos.push("pin = ?");
    valores.push(body.pin);
  }

  if (campos.length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });
  }

  valores.push(id);
  db.prepare(`UPDATE funcionarios SET ${campos.join(", ")} WHERE id = ?`).run(...valores);

  const atualizado = db
    .prepare("SELECT id, nome, funcao, tipo, tipo_contrato, ativo FROM funcionarios WHERE id = ?")
    .get(id);

  return NextResponse.json(atualizado);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }
  db.prepare("UPDATE funcionarios SET ativo = 0 WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
