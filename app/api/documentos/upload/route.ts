import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-documentos";
import { pastaUpload, parseIdObrigatorio, caminhoDeUploadSeguro } from "@/lib/uploads";
import { ehAdminLogado } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";

function extensaoPermitida(nome: string) {
  const ext = path.extname(nome).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".heic", ".pdf"].includes(ext);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const formData = await req.formData();
  const arquivo = formData.get("arquivo") as File | null;
  const documentoId = parseIdObrigatorio(formData.get("documento_id") as string | null);

  if (!arquivo || !documentoId) {
    return NextResponse.json({ error: "arquivo e documento_id (numero valido) sao obrigatorios" }, { status: 400 });
  }
  const documentoExiste = db.prepare("SELECT 1 FROM documentos WHERE id = ?").get(documentoId);
  if (!documentoExiste) {
    return NextResponse.json({ error: "documento nao encontrado" }, { status: 404 });
  }
  if (!extensaoPermitida(arquivo.name)) {
    return NextResponse.json({ error: "Envie uma imagem ou PDF." }, { status: 400 });
  }

  const pastaDestino = pastaUpload("documentos");
  const ext = path.extname(arquivo.name).toLowerCase();
  const nomeArquivo = `documento-${documentoId}-${Date.now()}${ext}`;
  const caminhoCompleto = caminhoDeUploadSeguro(pastaDestino, nomeArquivo);
  if (!caminhoCompleto) {
    return NextResponse.json({ error: "caminho invalido" }, { status: 400 });
  }

  const bytes = await arquivo.arrayBuffer();
  fs.writeFileSync(caminhoCompleto, Buffer.from(bytes));

  const urlPublica = `/api/uploads/documentos/${nomeArquivo}`;
  db.prepare("UPDATE documentos SET arquivo_url = ? WHERE id = ?").run(urlPublica, documentoId);

  return NextResponse.json({ url: urlPublica });
}
