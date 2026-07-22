import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-galeria";
import fs from "fs";
import path from "path";

const PASTA = path.join(process.cwd(), "public", "uploads", "galeria");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria");

  let query = `
    SELECT r.*, s.nome AS setor_nome
    FROM registros_campo r
    LEFT JOIN setores s ON s.id = r.setor_id
    WHERE 1 = 1
  `;
  const params: (string | number)[] = [];
  if (categoria) {
    query += " AND r.categoria = ?";
    params.push(categoria);
  }
  query += " ORDER BY r.id DESC LIMIT 100";

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const arquivo = formData.get("arquivo") as File | null;
  const categoria = formData.get("categoria") as string | null;
  const descricao = formData.get("descricao") as string | null;
  const autorId = formData.get("autor_id") as string | null;
  const autorNome = formData.get("autor_nome") as string | null;
  const setorId = formData.get("setor_id") as string | null;

  if (!arquivo || !categoria || !autorNome) {
    return NextResponse.json({ error: "arquivo, categoria e autor_nome sao obrigatorios" }, { status: 400 });
  }
  const ext = path.extname(arquivo.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp", ".heic"].includes(ext)) {
    return NextResponse.json({ error: "Envie uma imagem valida." }, { status: 400 });
  }

  if (!fs.existsSync(PASTA)) fs.mkdirSync(PASTA, { recursive: true });
  const nomeArquivo = `registro-${Date.now()}${ext}`;
  const bytes = await arquivo.arrayBuffer();
  fs.writeFileSync(path.join(PASTA, nomeArquivo), Buffer.from(bytes));
  const fotoUrl = `/uploads/galeria/${nomeArquivo}`;

  const result = db
    .prepare(
      "INSERT INTO registros_campo (autor_id, autor_nome, categoria, descricao, foto_url, setor_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(autorId ? Number(autorId) : null, autorNome, categoria, descricao ?? null, fotoUrl, setorId ? Number(setorId) : null);

  const novo = db.prepare("SELECT * FROM registros_campo WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(novo, { status: 201 });
}
