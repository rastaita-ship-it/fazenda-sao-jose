import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-animais";
import { pastaUpload, parseIdObrigatorio, caminhoDeUploadSeguro, arquivoDentroDoLimite } from "@/lib/uploads";
import { ehAdminLogado } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";

function extensaoPermitida(nome: string) {
  const ext = path.extname(nome).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".heic"].includes(ext);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const formData = await req.formData();
  const arquivo = formData.get("arquivo") as File | null;
  const animalId = parseIdObrigatorio(formData.get("animal_id") as string | null);

  if (!arquivo || !animalId) {
    return NextResponse.json({ error: "arquivo e animal_id (numero valido) sao obrigatorios" }, { status: 400 });
  }
  const animalExiste = db.prepare("SELECT 1 FROM animais WHERE id = ?").get(animalId);
  if (!animalExiste) {
    return NextResponse.json({ error: "animal nao encontrado" }, { status: 404 });
  }
  if (!extensaoPermitida(arquivo.name)) {
    return NextResponse.json({ error: "Envie uma imagem (jpg, png, webp)." }, { status: 400 });
  }
  if (!arquivoDentroDoLimite(arquivo)) {
    return NextResponse.json({ error: "Arquivo muito grande (limite de 10MB)." }, { status: 400 });
  }

  const pastaDestino = pastaUpload("animais");
  const ext = path.extname(arquivo.name).toLowerCase();
  const nomeArquivo = `foto-${animalId}-${Date.now()}${ext}`;
  const caminhoCompleto = caminhoDeUploadSeguro(pastaDestino, nomeArquivo);
  if (!caminhoCompleto) {
    return NextResponse.json({ error: "caminho invalido" }, { status: 400 });
  }

  const bytes = await arquivo.arrayBuffer();
  fs.writeFileSync(caminhoCompleto, Buffer.from(bytes));

  const urlPublica = `/api/uploads/animais/${nomeArquivo}`;
  db.prepare("UPDATE animais SET foto_url = ? WHERE id = ?").run(urlPublica, animalId);

  return NextResponse.json({ url: urlPublica });
}
