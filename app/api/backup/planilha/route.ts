import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const tabelas = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[];

  const workbook = new ExcelJS.Workbook();
  const nomesUsados = new Set<string>();

  for (const { name } of tabelas) {
    let nomeAba = name.slice(0, 31);
    let sufixo = 1;
    while (nomesUsados.has(nomeAba)) {
      nomeAba = `${name.slice(0, 28)}_${sufixo++}`;
    }
    nomesUsados.add(nomeAba);

    const sheet = workbook.addWorksheet(nomeAba);
    const colunas = db.prepare(`PRAGMA table_info("${name}")`).all() as { name: string }[];
    sheet.columns = colunas.map((c) => ({ header: c.name, key: c.name, width: 18 }));

    const linhas = db.prepare(`SELECT * FROM "${name}"`).all();
    if (linhas.length > 0) sheet.addRows(linhas);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const dataHoje = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fazenda-dados-${dataHoje}.xlsx"`,
    },
  });
}
