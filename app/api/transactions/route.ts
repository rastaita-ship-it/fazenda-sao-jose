import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-custos";
import { TransacaoComSetor } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const setorId = searchParams.get("setor_id");
  const tipo = searchParams.get("tipo");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = `
    SELECT t.*, s.nome AS setor_nome, s.cor AS setor_cor
    FROM transacoes t
    JOIN setores s ON s.id = t.setor_id
    WHERE 1 = 1
  `;
  const params: (string | number)[] = [];

  if (setorId) {
    query += " AND t.setor_id = ?";
    params.push(Number(setorId));
  }
  if (tipo) {
    query += " AND t.tipo = ?";
    params.push(tipo);
  }
  if (status) {
    query += " AND t.status = ?";
    params.push(status);
  }
  if (from) {
    query += " AND t.data >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND t.data <= ?";
    params.push(to);
  }

  query += " ORDER BY t.data DESC, t.id DESC LIMIT 200";

  const rows = db.prepare(query).all(...params) as TransacaoComSetor[];
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { setor_id, tipo, descricao, valor, data, categoria, status, classificacao_custo } = body;

  if (!setor_id || !tipo || !descricao || valor == null || !data) {
    return NextResponse.json(
      { error: "Campos obrigatorios: setor_id, tipo, descricao, valor, data" },
      { status: 400 }
    );
  }
  if (!["receita", "despesa"].includes(tipo)) {
    return NextResponse.json({ error: "tipo invalido" }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO transacoes (setor_id, tipo, categoria, descricao, valor, data, status, classificacao_custo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    setor_id,
    tipo,
    categoria ?? null,
    descricao,
    Number(valor),
    data,
    status ?? "pago",
    tipo === "despesa" ? classificacao_custo ?? null : null
  );

  const novaTransacao = db
    .prepare(
      `SELECT t.*, s.nome AS setor_nome, s.cor AS setor_cor
       FROM transacoes t JOIN setores s ON s.id = t.setor_id
       WHERE t.id = ?`
    )
    .get(result.lastInsertRowid);

  return NextResponse.json(novaTransacao, { status: 201 });
}
