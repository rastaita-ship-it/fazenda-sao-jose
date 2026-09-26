import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-manejo";
import "@/lib/db-manejo-grupo";
import { estaLogado } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const ano = searchParams.get("ano");
  const mes = searchParams.get("mes");

  if (!ano || !mes) {
    return NextResponse.json({ error: "ano e mes sao obrigatorios" }, { status: 400 });
  }

  const mesFormatado = String(mes).padStart(2, "0");
  const from = `${ano}-${mesFormatado}-01`;
  const to = `${ano}-${mesFormatado}-31`;

  const rows = db
    .prepare(
      `
      SELECT m.*, s.nome AS setor_nome, s.cor AS setor_cor, f.nome AS funcionario_nome
      FROM manejos m
      JOIN setores s ON s.id = m.setor_id
      LEFT JOIN funcionarios f ON f.id = m.funcionario_id
      WHERE m.data_planejada BETWEEN ? AND ?
      ORDER BY m.data_planejada ASC
    `
    )
    .all(from, to);

  return NextResponse.json(rows);
}
