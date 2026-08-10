import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-patrimonio-arquivos";
import { pastaUpload, parseIdObrigatorio, caminhoDeUploadSeguro, arquivoDentroDoLimite } from "@/lib/uploads";
import { ehAdminLogado } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";

function extensaoPermitida(nome: string, tipoCampo: string) {
  const ext = path.extname(nome).toLowerCase();
  if (tipoCampo === "foto") {
    return [".jpg", ".jpeg", ".png", ".webp", ".heic"].includes(ext);
  }
  return [".pdf"].includes(ext);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const formData = await req.formData();
  const arquivo = formData.get("arquivo") as File | null;
  const patrimonioId = parseIdObrigatorio(formData.get("patrimonio_id") as string | null);
  const tipoCampo = formData.get("tipo_campo") as string | null;

  if (!arquivo || !patrimonioId || !tipoCampo) {
    return NextResponse.json(
      { error: "arquivo, patrimonio_id (numero valido) e tipo_campo sao obrigatorios" },
      { status: 400 }
    );
  }
  if (!["foto", "manual"].includes(tipoCampo)) {
    return NextResponse.json({ error: "tipo_campo invalido" }, { status: 400 });
  }
  const patrimonioExiste = db.prepare("SELECT 1 FROM patrimonio WHERE id = ?").get(patrimonioId);
  if (!patrimonioExiste) {
    return NextResponse.json({ error: "patrimonio nao encontrado" }, { status: 404 });
  }
  if (!extensaoPermitida(arquivo.name, tipoCampo)) {
    return NextResponse.json(
      { error: tipoCampo === "foto" ? "Envie uma imagem (jpg, png, webp)." : "Envie um arquivo PDF." },
      { status: 400 }
    );
  }
  if (!arquivoDentroDoLimite(arquivo)) {
    return NextResponse.json({ error: "Arquivo muito grande (limite de 10MB)." }, { status: 400 });
  }

  const pastaDestino = pastaUpload("patrimonio");
  const ext = path.extname(arquivo.name).toLowerCase();
  const nomeArquivo = `${tipoCampo}-${patrimonioId}-${Date.now()}${ext}`;
  const caminhoCompleto = caminhoDeUploadSeguro(pastaDestino, nomeArquivo);
  if (!caminhoCompleto) {
    return NextResponse.json({ error: "caminho invalido" }, { status: 400 });
  }

  const bytes = await arquivo.arrayBuffer();
  fs.writeFileSync(caminhoCompleto, Buffer.from(bytes));

  const urlPublica = `/api/uploads/patrimonio/${nomeArquivo}`;
  const coluna = tipoCampo === "foto" ? "foto_url" : "manual_url";

  db.prepare(`UPDATE patrimonio SET ${coluna} = ? WHERE id = ?`).run(urlPublica, patrimonioId);

  return NextResponse.json({ url: urlPublica });
}
