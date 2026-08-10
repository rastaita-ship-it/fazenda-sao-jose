import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-recibo";
import { pastaUpload, parseIdObrigatorio, caminhoDeUploadSeguro } from "@/lib/uploads";
import { ehAdminLogado } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const formData = await req.formData();
  const arquivo = formData.get("arquivo") as File | null;
  const transacaoId = parseIdObrigatorio(formData.get("transacao_id") as string | null);

  if (!arquivo || !transacaoId) {
    return NextResponse.json({ error: "arquivo e transacao_id (numero valido) sao obrigatorios" }, { status: 400 });
  }
  const transacaoExiste = db.prepare("SELECT 1 FROM transacoes WHERE id = ?").get(transacaoId);
  if (!transacaoExiste) {
    return NextResponse.json({ error: "lancamento nao encontrado" }, { status: 404 });
  }
  const ext = path.extname(arquivo.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".heic", ".pdf"].includes(ext)) {
    return NextResponse.json({ error: "Formato nao suportado." }, { status: 400 });
  }

  const pastaDestino = pastaUpload("recibos");
  const nomeArquivo = `recibo-${transacaoId}-${Date.now()}${ext}`;
  const caminhoCompleto = caminhoDeUploadSeguro(pastaDestino, nomeArquivo);
  if (!caminhoCompleto) {
    return NextResponse.json({ error: "caminho invalido" }, { status: 400 });
  }
  const bytes = await arquivo.arrayBuffer();
  fs.writeFileSync(caminhoCompleto, Buffer.from(bytes));

  const urlPublica = `/api/uploads/recibos/${nomeArquivo}`;
  db.prepare("UPDATE transacoes SET recibo_url = ? WHERE id = ?").run(urlPublica, transacaoId);

  return NextResponse.json({ url: urlPublica });
}
