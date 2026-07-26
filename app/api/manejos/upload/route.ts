import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-manejo-foto";
import { pastaUpload } from "@/lib/uploads";
import { estaLogado } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const formData = await req.formData();
  const arquivo = formData.get("arquivo") as File | null;
  const manejoId = formData.get("manejo_id") as string | null;

  if (!arquivo || !manejoId) {
    return NextResponse.json({ error: "arquivo e manejo_id sao obrigatorios" }, { status: 400 });
  }
  const ext = path.extname(arquivo.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".heic"].includes(ext)) {
    return NextResponse.json({ error: "Envie uma imagem valida." }, { status: 400 });
  }

  const pastaDestino = pastaUpload("manejo");
  const nomeArquivo = `manejo-${manejoId}-${Date.now()}${ext}`;
  const bytes = await arquivo.arrayBuffer();
  fs.writeFileSync(path.join(pastaDestino, nomeArquivo), Buffer.from(bytes));

  const urlPublica = `/api/uploads/manejo/${nomeArquivo}`;
  db.prepare("UPDATE manejos SET foto_conclusao_url = ? WHERE id = ?").run(urlPublica, manejoId);

  return NextResponse.json({ url: urlPublica });
}
