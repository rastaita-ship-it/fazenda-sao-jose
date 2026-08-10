import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-ponto-geo";
import "@/lib/db-ponto-foto";
import "@/lib/db-ponto-chave";
import { estaDentroDaFazenda, calcularDistanciaMetros, FAZENDA_COORDENADAS } from "@/lib/geo";
import { pastaUpload } from "@/lib/uploads";
import { estaLogado } from "@/lib/auth-helpers";
import { lerCorpoJson } from "@/lib/api";
import fs from "fs";
import path from "path";

const TAMANHO_MAXIMO_FOTO_BYTES = 4 * 1024 * 1024; // 4MB decodificado

function salvarFotoSelfie(registroId: number, fotoBase64: string): string | null {
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/.exec(fotoBase64);
  if (!match) return null;

  const [, extensaoBruta, dadosBase64] = match;
  const buffer = Buffer.from(dadosBase64, "base64");
  if (buffer.length === 0 || buffer.length > TAMANHO_MAXIMO_FOTO_BYTES) return null;

  const ext = extensaoBruta === "jpg" ? "jpeg" : extensaoBruta;
  const pastaDestino = pastaUpload("ponto");
  const nomeArquivo = `selfie-${registroId}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(pastaDestino, nomeArquivo), buffer);

  return `/api/uploads/ponto/${nomeArquivo}`;
}

export interface RegistroPonto {
  id: number;
  funcionario_id: number;
  tipo: "entrada" | "saida";
  data_hora: string;
  observacao: string | null;
}

export async function GET(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const funcionarioId = searchParams.get("funcionario_id");
  const data = searchParams.get("data");

  let query = `
    SELECT r.*, f.nome AS funcionario_nome
    FROM registros_ponto r
    JOIN funcionarios f ON f.id = r.funcionario_id
    WHERE 1 = 1
  `;
  const params: (string | number)[] = [];

  if (funcionarioId) {
    query += " AND r.funcionario_id = ?";
    params.push(Number(funcionarioId));
  }
  if (data) {
    query += " AND date(r.data_hora) = ?";
    params.push(data);
  }

  query += " ORDER BY r.data_hora DESC LIMIT 200";

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

/**
 * POST /api/timeclock
 * Body: { funcionario_id, latitude, longitude }
 * Exige latitude/longitude e BLOQUEIA o registro se o funcionário
 * estiver fora do raio permitido da fazenda.
 */
export async function POST(req: NextRequest) {
  if (!estaLogado(req)) {
    return NextResponse.json({ error: "Precisa estar logado." }, { status: 401 });
  }

  const resultado = await lerCorpoJson<{
    funcionario_id?: number;
    latitude?: number;
    longitude?: number;
    observacao?: string;
    foto_base64?: string;
    chave_cliente?: string;
  }>(req);
  if (!resultado.ok) return resultado.resposta;
  const { funcionario_id, latitude, longitude, observacao, foto_base64, chave_cliente } = resultado.body;

  if (!funcionario_id) {
    return NextResponse.json({ error: "funcionario_id é obrigatório." }, { status: 400 });
  }

  if (typeof chave_cliente === "string" && chave_cliente) {
    const existente = db
      .prepare("SELECT * FROM registros_ponto WHERE chave_cliente = ?")
      .get(chave_cliente);
    if (existente) {
      return NextResponse.json(existente, { status: 200 });
    }
  }
  if (latitude == null || longitude == null) {
    return NextResponse.json(
      { error: "Não foi possível obter sua localização. Ative o GPS e tente novamente." },
      { status: 400 }
    );
  }

  const dentro = estaDentroDaFazenda(latitude, longitude);
  if (!dentro) {
    const distancia = Math.round(
      calcularDistanciaMetros(
        latitude,
        longitude,
        FAZENDA_COORDENADAS.latitude,
        FAZENDA_COORDENADAS.longitude
      )
    );
    return NextResponse.json(
      {
        error: `Você está a ${distancia}m da fazenda. É preciso estar dentro da área da propriedade para bater o ponto.`,
      },
      { status: 403 }
    );
  }

  const ultimoHoje = db
    .prepare(
      `SELECT tipo FROM registros_ponto
       WHERE funcionario_id = ? AND date(data_hora) = date('now', 'localtime')
       ORDER BY data_hora DESC LIMIT 1`
    )
    .get(funcionario_id) as { tipo: string } | undefined;

  const proximoTipo = !ultimoHoje || ultimoHoje.tipo === "saida" ? "entrada" : "saida";

  const stmt = db.prepare(
    `INSERT INTO registros_ponto (funcionario_id, tipo, data_hora, observacao, latitude, longitude, dentro_area, chave_cliente)
     VALUES (?, ?, datetime('now', 'localtime'), ?, ?, ?, 1, ?)`
  );
  const result = stmt.run(
    funcionario_id,
    proximoTipo,
    observacao ?? null,
    latitude,
    longitude,
    typeof chave_cliente === "string" && chave_cliente ? chave_cliente : null
  );
  const registroId = Number(result.lastInsertRowid);

  if (typeof foto_base64 === "string" && foto_base64.length > 0) {
    const fotoUrl = salvarFotoSelfie(registroId, foto_base64);
    if (fotoUrl) {
      db.prepare("UPDATE registros_ponto SET foto_url = ? WHERE id = ?").run(fotoUrl, registroId);
    }
  }

  const novo = db.prepare("SELECT * FROM registros_ponto WHERE id = ?").get(registroId);

  return NextResponse.json(novo, { status: 201 });
}
