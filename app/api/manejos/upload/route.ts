import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-manejo-foto";
import { pastaUpload, parseIdObrigatorio, caminhoDeUploadSeguro } from "@/lib/uploads";
import { estaLogado } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const formData = await req.formData();
  const arquivo = formData.get("arquivo") as File | null;
  const manejoId = parseIdObrigatorio(formData.get("manejo_id") as string | null);

  if (!arquivo || !manejoId) {
    return NextResponse.json({ error: "arquivo e manejo_id (numero valido) sao obrigatorios" }, { status: 400 });
  }
  const manejoExiste = db.prepare("SELECT 1 FROM manejos WHERE id = ?").get(manejoId);
  if (!manejoExiste) {
    return NextResponse.json({ error: "manejo nao encontrado" }, { status: 404 });
  }
  const ext = path.extname(arquivo.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".heic"].includes(ext)) {
    return NextResponse.json({ error: "Envie uma imagem valida." }, { status: 400 });
  }

  const pastaDestino = pastaUpload("manejo");
  const nomeArquivo = `manejo-${manejoId}-${Date.now()}${ext}`;
  const caminhoCompleto = caminhoDeUploadSeguro(pastaDestino, nomeArquivo);
  if (!caminhoCompleto) {
    return NextResponse.json({ error: "caminho invalido" }, { status: 400 });
  }
  const bytes = await arquivo.arrayBuffer();
  fs.writeFileSync(caminhoCompleto, Buffer.from(bytes));

  const urlPublica = `/api/uploads/manejo/${nomeArquivo}`;
  db.prepare("UPDATE manejos SET foto_conclusao_url = ? WHERE id = ?").run(urlPublica, manejoId);

  return NextResponse.json({ url: urlPublica });
}
