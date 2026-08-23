import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { db, DB_PATH } from "@/lib/db";
import { ehAdminLogado } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }
  if (DB_PATH === ":memory:") {
    return NextResponse.json({ error: "Backup indisponivel em modo de teste." }, { status: 400 });
  }

  // Em WAL, dados recentes podem ainda estar so no arquivo -wal; checkpoint
  // garante que o .db principal fica completo antes de servir o download.
  db.pragma("wal_checkpoint(FULL)");
  const conteudo = fs.readFileSync(DB_PATH);
  const dataHoje = new Date().toISOString().slice(0, 10);

  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="fazenda-backup-${dataHoje}.db"`,
      "Content-Length": String(conteudo.length),
    },
  });
}
