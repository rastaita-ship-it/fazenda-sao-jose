import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ehAdminLogado } from "@/lib/auth-helpers";
import { Setor } from "@/lib/types";

const SETOR_GERAL_NOME = "Geral/Administrativo";

interface GrupoRow {
  descricao: string;
  tipo: string;
  qtd: number;
  total: number;
  primeira_data: string;
  ultima_data: string;
}

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const setorGeral = db.prepare("SELECT id FROM setores WHERE nome = ?").get(SETOR_GERAL_NOME) as
    | { id: number }
    | undefined;

  if (!setorGeral) {
    return NextResponse.json({ setores: [], grupos: [], totalPendentes: 0 });
  }

  const setores = db
    .prepare("SELECT * FROM setores WHERE ativo = 1 AND nome != ? ORDER BY id ASC")
    .all(SETOR_GERAL_NOME) as Setor[];

  const grupos = db
    .prepare(
      `SELECT descricao, tipo, COUNT(*) AS qtd, SUM(valor) AS total,
              MIN(data) AS primeira_data, MAX(data) AS ultima_data
       FROM transacoes
       WHERE setor_id = ?
       GROUP BY descricao, tipo
       ORDER BY total DESC`
    )
    .all(setorGeral.id) as GrupoRow[];

  const totalPendentes = grupos.reduce((soma, g) => soma + g.qtd, 0);

  return NextResponse.json({ setores, grupos, totalPendentes });
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { descricao, tipo, setor_id } = body as {
    descricao?: string;
    tipo?: string;
    setor_id?: number;
  };

  if (!descricao || !tipo || !setor_id) {
    return NextResponse.json(
      { error: "Campos obrigatorios: descricao, tipo, setor_id" },
      { status: 400 }
    );
  }

  const setorDestino = db.prepare("SELECT id FROM setores WHERE id = ?").get(setor_id);
  if (!setorDestino) {
    return NextResponse.json({ error: "Setor invalido" }, { status: 400 });
  }

  const setorGeral = db.prepare("SELECT id FROM setores WHERE nome = ?").get(SETOR_GERAL_NOME) as
    | { id: number }
    | undefined;
  if (!setorGeral) {
    return NextResponse.json({ error: "Setor Geral/Administrativo nao encontrado" }, { status: 400 });
  }

  const resultado = db
    .prepare("UPDATE transacoes SET setor_id = ? WHERE descricao = ? AND tipo = ? AND setor_id = ?")
    .run(setor_id, descricao, tipo, setorGeral.id);

  return NextResponse.json({ atualizadas: resultado.changes });
}
