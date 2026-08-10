import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-manejo";
import "@/lib/db-manejo-grupo";
import { estaLogado } from "@/lib/auth-helpers";
import { lerCorpoJson } from "@/lib/api";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const setorId = searchParams.get("setor_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const funcionarioId = searchParams.get("funcionario_id");
  const data = searchParams.get("data");

  let query = `
    SELECT m.*, s.nome AS setor_nome, s.cor AS setor_cor, f.nome AS funcionario_nome
    FROM manejos m
    JOIN setores s ON s.id = m.setor_id
    LEFT JOIN funcionarios f ON f.id = m.funcionario_id
    WHERE 1 = 1
  `;
  const params: (string | number)[] = [];

  if (setorId) {
    query += " AND m.setor_id = ?";
    params.push(Number(setorId));
  }
  if (from) {
    query += " AND m.data_planejada >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND m.data_planejada <= ?";
    params.push(to);
  }
  if (funcionarioId) {
    query += " AND m.funcionario_id = ?";
    params.push(Number(funcionarioId));
  }
  if (data) {
    query += " AND m.data_planejada = ?";
    params.push(data);
  }

  query += " ORDER BY m.data_planejada ASC";

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

const MAX_DIAS_INTERVALO = 366;

export async function POST(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const resultado = await lerCorpoJson<{
    setor_id?: number;
    atividade_nome?: string;
    data_inicio?: string;
    data_fim?: string;
    funcionario_id?: number;
    observacao?: string;
    origem?: string;
  }>(req);
  if (!resultado.ok) return resultado.resposta;
  const { setor_id, atividade_nome, data_inicio, data_fim, funcionario_id, observacao, origem } = resultado.body;

  if (!setor_id || !atividade_nome || !data_inicio) {
    return NextResponse.json(
      { error: "Campos obrigatorios: setor_id, atividade_nome, data_inicio" },
      { status: 400 }
    );
  }

  const inicio = new Date(data_inicio + "T12:00:00");
  const fim = data_fim ? new Date(data_fim + "T12:00:00") : inicio;
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) {
    return NextResponse.json({ error: "Periodo invalido." }, { status: 400 });
  }
  const diasNoIntervalo = Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1;
  if (diasNoIntervalo > MAX_DIAS_INTERVALO) {
    return NextResponse.json(
      { error: `O periodo nao pode ter mais de ${MAX_DIAS_INTERVALO} dias.` },
      { status: 400 }
    );
  }

  const datas: string[] = [];
  const atual = new Date(inicio);
  while (atual <= fim) {
    datas.push(atual.toISOString().slice(0, 10));
    atual.setDate(atual.getDate() + 1);
  }

  const grupoId = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO manejos (setor_id, atividade_nome, data_planejada, funcionario_id, observacao, origem, grupo_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const inserir = db.transaction(() => {
    for (const data of datas) {
      stmt.run(
        setor_id,
        atividade_nome,
        data,
        funcionario_id ?? null,
        observacao ?? null,
        origem ?? "avulso",
        grupoId
      );
    }
  });
  inserir();

  const criados = db.prepare("SELECT * FROM manejos WHERE grupo_id = ? ORDER BY data_planejada ASC").all(grupoId);
  return NextResponse.json({ grupo_id: grupoId, itens: criados }, { status: 201 });
}
