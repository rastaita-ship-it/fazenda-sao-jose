import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-custos";
import { ehAdminLogado } from "@/lib/auth-helpers";

function escaparCsv(valor: string | number | null) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  if (texto.includes(",") || texto.includes('"') || texto.includes("\n")) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;
  const from = searchParams.get("from") ?? defaultFrom;
  const to = searchParams.get("to") ?? defaultTo;

  const linhas = db
    .prepare(
      `SELECT t.data, t.tipo, s.nome AS setor, t.categoria, t.descricao, t.valor, t.status, t.classificacao_custo
       FROM transacoes t
       JOIN setores s ON s.id = t.setor_id
       WHERE t.data BETWEEN ? AND ?
       ORDER BY t.data ASC, t.id ASC`
    )
    .all(from, to) as {
    data: string;
    tipo: string;
    setor: string;
    categoria: string | null;
    descricao: string;
    valor: number;
    status: string;
    classificacao_custo: string | null;
  }[];

  const cabecalho = ["Data", "Tipo", "Setor", "Categoria", "Descricao", "Valor", "Status", "Classificacao"];
  const linhasCsv = [cabecalho.join(",")];

  for (const l of linhas) {
    linhasCsv.push(
      [
        escaparCsv(l.data),
        escaparCsv(l.tipo === "receita" ? "Receita" : "Despesa"),
        escaparCsv(l.setor),
        escaparCsv(l.categoria),
        escaparCsv(l.descricao),
        escaparCsv(l.valor.toFixed(2).replace(".", ",")),
        escaparCsv(l.status),
        escaparCsv(l.classificacao_custo ?? ""),
      ].join(",")
    );
  }

  const csv = "\uFEFF" + linhasCsv.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fluxo-caixa-${from}-a-${to}.csv"`,
    },
  });
}
