import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-recibo";
import fs from "fs";
import path from "path";

const PASTA = path.join(process.cwd(), "public", "uploads", "recibos");

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const arquivo = formData.get("arquivo") as File | null;
  const transacaoId = formData.get("transacao_id") as string | null;

  if (!arquivo || !transacaoId) {
    return NextResponse.json({ error: "arquivo e transacao_id obrigatorios" }, { status: 400 });
  }
  const ext = path.extname(arquivo.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".heic", ".pdf"].includes(ext)) {
    return NextResponse.json({ error: "Formato nao suportado." }, { status: 400 });
  }

  if (!fs.existsSync(PASTA)) fs.mkdirSync(PASTA, { recursive: true });
  const nomeArquivo = `recibo-${transacaoId}-${Date.now()}${ext}`;
  const bytes = await arquivo.arrayBuffer();
  fs.writeFileSync(path.join(PASTA, nomeArquivo), Buffer.from(bytes));

  const urlPublica = `/uploads/recibos/${nomeArquivo}`;
  db.prepare("UPDATE transacoes SET recibo_url = ? WHERE id = ?").run(urlPublica, transacaoId);

  return NextResponse.json({ url: urlPublica });
}
