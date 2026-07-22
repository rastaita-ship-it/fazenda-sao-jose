import { NextRequest, NextResponse } from "next/server";
import { UPLOADS_DIR } from "@/lib/uploads";
import fs from "fs";
import path from "path";

const TIPOS_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".pdf": "application/pdf",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { caminho: string[] } }
) {
  const partes = params.caminho;
  if (!partes || partes.some((p) => p.includes(".."))) {
    return NextResponse.json({ error: "caminho invalido" }, { status: 400 });
  }

  const caminhoCompleto = path.join(UPLOADS_DIR, ...partes);
  if (!caminhoCompleto.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: "caminho invalido" }, { status: 400 });
  }
  if (!fs.existsSync(caminhoCompleto)) {
    return NextResponse.json({ error: "arquivo nao encontrado" }, { status: 404 });
  }

  const buffer = fs.readFileSync(caminhoCompleto);
  const ext = path.extname(caminhoCompleto).toLowerCase();
  const mime = TIPOS_MIME[ext] || "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
