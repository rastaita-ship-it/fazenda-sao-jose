import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import "@/lib/db-salario";

export interface Funcionario {
  id: number;
  nome: string;
  funcao: string | null;
  tipo: string;
  tipo_contrato: string;
  ativo: number;
  criado_em: string;
}

export async function GET() {
  const funcionarios = db
    .prepare(
      "SELECT id, nome, funcao, tipo, tipo_contrato, ativo, criado_em FROM funcionarios WHERE ativo = 1 ORDER BY nome ASC"
    )
    .all() as Funcionario[];
  return NextResponse.json(funcionarios);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, funcao, tipo, pin, tipo_contrato, salario_mensal } = body;

  if (!nome || !nome.trim()) {
    return NextResponse.json({ error: "Nome e obrigatorio." }, { status: 400 });
  }
  if (!pin || !/^[0-9]{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN deve ter exatamente 4 numeros." }, { status: 400 });
  }
  const tipoFinal = tipo === "chefe" ? "chefe" : "campo";
  const tipoContratoFinal = tipo_contrato === "diarista" ? "diarista" : "fixo";

  const pinEmUso = db.prepare("SELECT id FROM funcionarios WHERE pin = ? AND ativo = 1").get(pin);
  if (pinEmUso) {
    return NextResponse.json({ error: "Esse PIN ja esta em uso por outro funcionario." }, { status: 409 });
  }

  const stmt = db.prepare(
    "INSERT INTO funcionarios (nome, funcao, tipo, pin, tipo_contrato, salario_mensal) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const result = stmt.run(
    nome.trim(),
    funcao ?? null,
    tipoFinal,
    pin,
    tipoContratoFinal,
    tipoContratoFinal === "fixo" ? salario_mensal ?? null : null
  );
  const novo = db
    .prepare(
      "SELECT id, nome, funcao, tipo, tipo_contrato, ativo, criado_em FROM funcionarios WHERE id = ?"
    )
    .get(result.lastInsertRowid);

  return NextResponse.json(novo, { status: 201 });
}
