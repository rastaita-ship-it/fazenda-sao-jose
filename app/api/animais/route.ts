import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-animais";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const setorId = searchParams.get("setor_id");
  const status = searchParams.get("status");

  let query = `
    SELECT a.*, s.nome AS setor_nome, s.cor AS setor_cor, t.nome AS talhao_nome,
      (SELECT peso_kg FROM animais_pesagens WHERE animal_id = a.id ORDER BY data DESC, id DESC LIMIT 1) AS peso_atual
    FROM animais a
    JOIN setores s ON s.id = a.setor_id
    LEFT JOIN talhoes t ON t.id = a.talhao_id
    WHERE 1 = 1
  `;
  const params: (string | number)[] = [];
  if (setorId) {
    query += " AND a.setor_id = ?";
    params.push(Number(setorId));
  }
  if (status) {
    query += " AND a.status = ?";
    params.push(status);
  } else {
    query += " AND a.status = 'ativo'";
  }
  query += " ORDER BY s.nome ASC, a.identificacao ASC";

  const animais = db.prepare(query).all(...params);
  return NextResponse.json(animais);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { setor_id, talhao_id, identificacao, nome, especie, sexo, data_nascimento, raca, observacao } = body;

  if (!setor_id || !identificacao || !especie || !sexo) {
    return NextResponse.json(
      { error: "Campos obrigatorios: setor_id, identificacao, especie, sexo" },
      { status: 400 }
    );
  }
  if (!["bovino", "ovino", "outro"].includes(especie)) {
    return NextResponse.json({ error: "especie invalida" }, { status: 400 });
  }
  if (!["macho", "femea"].includes(sexo)) {
    return NextResponse.json({ error: "sexo invalido" }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO animais (setor_id, talhao_id, identificacao, nome, especie, sexo, data_nascimento, raca, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    setor_id,
    talhao_id ?? null,
    identificacao,
    nome ?? null,
    especie,
    sexo,
    data_nascimento ?? null,
    raca ?? null,
    observacao ?? null
  );

  const novo = db
    .prepare(
      `SELECT a.*, s.nome AS setor_nome, s.cor AS setor_cor, t.nome AS talhao_nome
       FROM animais a JOIN setores s ON s.id = a.setor_id
       LEFT JOIN talhoes t ON t.id = a.talhao_id
       WHERE a.id = ?`
    )
    .get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
