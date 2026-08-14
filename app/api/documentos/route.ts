import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-documentos";
import "@/lib/db-documentos-tipos";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const status = searchParams.get("status") ?? "ativo";
  const vencendoEm = searchParams.get("vencendo_em");

  let query = `
    SELECT d.*, p.nome AS patrimonio_nome, f.nome AS funcionario_nome
    FROM documentos d
    LEFT JOIN patrimonio p ON p.id = d.patrimonio_id
    LEFT JOIN funcionarios f ON f.id = d.funcionario_id
    WHERE d.status = ?
  `;
  const params: (string | number)[] = [status];

  if (tipo) {
    query += " AND d.tipo = ?";
    params.push(tipo);
  }
  if (vencendoEm) {
    query += " AND d.data_vencimento IS NOT NULL AND d.data_vencimento <= date('now', ?)";
    params.push(`+${Number(vencendoEm)} days`);
  }
  query += " ORDER BY (d.data_vencimento IS NULL), d.data_vencimento ASC";

  const documentos = db.prepare(query).all(...params);
  return NextResponse.json(documentos);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { tipo, titulo, patrimonio_id, funcionario_id, numero_documento, data_emissao, data_vencimento, observacao } = body;

  if (!tipo || !titulo) {
    return NextResponse.json({ error: "Campos obrigatorios: tipo, titulo" }, { status: 400 });
  }
  if (!["licenca", "seguro", "cnh", "nota_fiscal", "contrato", "car", "receituario", "certidao", "outro"].includes(tipo)) {
    return NextResponse.json({ error: "tipo invalido" }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO documentos (tipo, titulo, patrimonio_id, funcionario_id, numero_documento, data_emissao, data_vencimento, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    tipo,
    titulo,
    patrimonio_id ?? null,
    funcionario_id ?? null,
    numero_documento ?? null,
    data_emissao ?? null,
    data_vencimento ?? null,
    observacao ?? null
  );

  const novo = db
    .prepare(
      `SELECT d.*, p.nome AS patrimonio_nome, f.nome AS funcionario_nome
       FROM documentos d
       LEFT JOIN patrimonio p ON p.id = d.patrimonio_id
       LEFT JOIN funcionarios f ON f.id = d.funcionario_id
       WHERE d.id = ?`
    )
    .get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
