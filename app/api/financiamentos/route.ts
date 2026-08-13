import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-financiamentos";
import { ehAdminLogado } from "@/lib/auth-helpers";
import { lerCorpoJson } from "@/lib/api";

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "ativo";

  const financiamentos = db
    .prepare(
      "SELECT * FROM financiamentos_rurais WHERE status = ? ORDER BY proxima_parcela ASC"
    )
    .all(status);
  return NextResponse.json(financiamentos);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const resultado = await lerCorpoJson<{
    instituicao?: string;
    descricao?: string;
    valor_parcela?: number;
    proxima_parcela?: string;
    periodicidade?: string;
    tem_proagro?: boolean;
    observacao?: string;
  }>(req);
  if (!resultado.ok) return resultado.resposta;
  const { instituicao, descricao, valor_parcela, proxima_parcela, periodicidade, tem_proagro, observacao } =
    resultado.body;

  if (!instituicao || !descricao || !proxima_parcela) {
    return NextResponse.json(
      { error: "Campos obrigatorios: instituicao, descricao, proxima_parcela" },
      { status: 400 }
    );
  }
  if (periodicidade && !["mensal", "anual"].includes(periodicidade)) {
    return NextResponse.json({ error: "periodicidade invalida" }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO financiamentos_rurais
      (instituicao, descricao, valor_parcela, proxima_parcela, periodicidade, tem_proagro, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    instituicao,
    descricao,
    valor_parcela ?? null,
    proxima_parcela,
    periodicidade ?? "mensal",
    tem_proagro ? 1 : 0,
    observacao ?? null
  );

  const novo = db.prepare("SELECT * FROM financiamentos_rurais WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
