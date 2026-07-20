import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-patrimonio-arquivos";
import fs from "fs";
import path from "path";

const PASTA_UPLOADS = path.join(process.cwd(), "public", "uploads", "patrimonio");

function extensaoPermitida(nome: string, tipoCampo: string) {
  const ext = path.extname(nome).toLowerCase();
  if (tipoCampo === "foto") {
    return [".jpg", ".jpeg", ".png", ".webp", ".heic"].includes(ext);
  }
  return [".pdf"].includes(ext);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const arquivo = formData.get("arquivo") as File | null;
  const patrimonioId = formData.get("patrimonio_id") as string | null;
  const tipoCampo = formData.get("tipo_campo") as string | null;

  if (!arquivo || !patrimonioId || !tipoCampo) {
    return NextResponse.json({ error: "arquivo, patrimonio_id e tipo_campo sao obrigatorios" }, { status: 400 });
  }
  if (!["foto", "manual"].includes(tipoCampo)) {
    return NextResponse.json({ error: "tipo_campo invalido" }, { status: 400 });
  }
  if (!extensaoPermitida(arquivo.name, tipoCampo)) {
    return NextResponse.json(
      { error: tipoCampo === "foto" ? "Envie uma imagem (jpg, png, webp)." : "Envie um arquivo PDF." },
      { status: 400 }
    );
  }

  if (!fs.existsSync(PASTA_UPLOADS)) {
    fs.mkdirSync(PASTA_UPLOADS, { recursive: true });
  }

  const ext = path.extname(arquivo.name).toLowerCase();
  const nomeArquivo = `${tipoCampo}-${patrimonioId}-${Date.now()}${ext}`;
  const caminhoCompleto = path.join(PASTA_UPLOADS, nomeArquivo);

  const bytes = await arquivo.arrayBuffer();
  fs.writeFileSync(caminhoCompleto, Buffer.from(bytes));

  const urlPublica = `/uploads/patrimonio/${nomeArquivo}`;
  const coluna = tipoCampo === "foto" ? "foto_url" : "manual_url";

  db.prepare(`UPDATE patrimonio SET ${coluna} = ? WHERE id = ?`).run(urlPublica, patrimonioId);

  return NextResponse.json({ url: urlPublica });
}
