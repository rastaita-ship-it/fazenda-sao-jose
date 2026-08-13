import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-chuva";
import { estaLogado } from "@/lib/auth-helpers";
import { lerCorpoJson } from "@/lib/api";

export async function GET(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const registros = db
    .prepare(
      `SELECT * FROM registros_chuva WHERE data >= date('now', '-60 days') ORDER BY data ASC`
    )
    .all();
  return NextResponse.json(registros);
}

export async function POST(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const resultado = await lerCorpoJson<{ data?: string; mm?: number; observacao?: string }>(req);
  if (!resultado.ok) return resultado.resposta;
  const { data, mm, observacao } = resultado.body;

  if (!data || mm == null) {
    return NextResponse.json({ error: "Campos obrigatorios: data, mm" }, { status: 400 });
  }
  if (Number(mm) < 0) {
    return NextResponse.json({ error: "mm nao pode ser negativo" }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO registros_chuva (data, mm, observacao) VALUES (?, ?, ?)
     ON CONFLICT(data) DO UPDATE SET mm = excluded.mm, observacao = excluded.observacao`
  ).run(data, Number(mm), observacao ?? null);

  const registro = db.prepare("SELECT * FROM registros_chuva WHERE data = ?").get(data);
  return NextResponse.json(registro, { status: 201 });
}
