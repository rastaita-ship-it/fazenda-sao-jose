import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-ponto-geo";
import { estaDentroDaFazenda, calcularDistanciaMetros, FAZENDA_COORDENADAS } from "@/lib/geo";

export const dynamic = "force-dynamic";

export interface RegistroPonto {
  id: number;
  funcionario_id: number;
  tipo: "entrada" | "saida";
  data_hora: string;
  observacao: string | null;
}

export async function GET(req: NextRequest) {
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
  const body = await req.json();
  const { funcionario_id, latitude, longitude, observacao } = body;

  if (!funcionario_id) {
    return NextResponse.json({ error: "funcionario_id é obrigatório." }, { status: 400 });
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
    `INSERT INTO registros_ponto (funcionario_id, tipo, data_hora, observacao, latitude, longitude, dentro_area)
     VALUES (?, ?, datetime('now', 'localtime'), ?, ?, ?, 1)`
  );
  const result = stmt.run(funcionario_id, proximoTipo, observacao ?? null, latitude, longitude);

  const novo = db
    .prepare("SELECT * FROM registros_ponto WHERE id = ?")
    .get(result.lastInsertRowid);

  return NextResponse.json(novo, { status: 201 });
}
