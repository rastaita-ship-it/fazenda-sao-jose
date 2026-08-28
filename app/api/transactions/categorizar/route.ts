import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-custos";
import "@/lib/db-talhoes";
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

interface RateioItem {
  setor_id: number;
  percentual: number;
}

interface TransacaoRow {
  id: number;
  tipo: string;
  categoria: string | null;
  descricao: string;
  valor: number;
  data: string;
  status: string;
  classificacao_custo: string | null;
  talhao_id: number | null;
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { descricao, tipo, setor_id, rateio } = body as {
    descricao?: string;
    tipo?: string;
    setor_id?: number;
    rateio?: RateioItem[];
  };

  if (!descricao || !tipo || (!setor_id && !rateio)) {
    return NextResponse.json(
      { error: "Campos obrigatorios: descricao, tipo, e setor_id ou rateio" },
      { status: 400 }
    );
  }

  const setorGeral = db.prepare("SELECT id FROM setores WHERE nome = ?").get(SETOR_GERAL_NOME) as
    | { id: number }
    | undefined;
  if (!setorGeral) {
    return NextResponse.json({ error: "Setor Geral/Administrativo nao encontrado" }, { status: 400 });
  }

  if (rateio) {
    if (!Array.isArray(rateio) || rateio.length < 2) {
      return NextResponse.json(
        { error: "Rateio precisa de pelo menos 2 setores." },
        { status: 400 }
      );
    }
    const somaPercentual = rateio.reduce((soma, r) => soma + r.percentual, 0);
    if (Math.abs(somaPercentual - 100) > 0.01) {
      return NextResponse.json(
        { error: "Os percentuais do rateio precisam somar 100." },
        { status: 400 }
      );
    }
    for (const r of rateio) {
      if (!r.setor_id || !(r.percentual > 0)) {
        return NextResponse.json({ error: "Rateio invalido." }, { status: 400 });
      }
      const setor = db.prepare("SELECT id FROM setores WHERE id = ?").get(r.setor_id);
      if (!setor) {
        return NextResponse.json({ error: "Setor invalido no rateio." }, { status: 400 });
      }
    }

    const linhas = db
      .prepare(
        `SELECT id, tipo, categoria, descricao, valor, data, status, classificacao_custo, talhao_id
         FROM transacoes WHERE descricao = ? AND tipo = ? AND setor_id = ?`
      )
      .all(descricao, tipo, setorGeral.id) as TransacaoRow[];

    const atualizarPrimeiro = db.prepare(
      "UPDATE transacoes SET setor_id = ?, valor = ? WHERE id = ?"
    );
    const inserirSplit = db.prepare(
      `INSERT INTO transacoes (setor_id, tipo, categoria, descricao, valor, data, status, classificacao_custo, talhao_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const aplicarRateio = db.transaction((linha: TransacaoRow) => {
      let restante = linha.valor;
      const [primeiro, ...demais] = rateio;
      const valoresDemais = demais.map((r) => {
        const v = Math.round(linha.valor * (r.percentual / 100) * 100) / 100;
        restante -= v;
        return v;
      });
      atualizarPrimeiro.run(primeiro.setor_id, Math.round(restante * 100) / 100, linha.id);
      demais.forEach((r, i) => {
        inserirSplit.run(
          r.setor_id,
          linha.tipo,
          linha.categoria,
          linha.descricao,
          valoresDemais[i],
          linha.data,
          linha.status,
          linha.classificacao_custo,
          linha.talhao_id
        );
      });
    });

    for (const linha of linhas) {
      aplicarRateio(linha);
    }

    return NextResponse.json({ atualizadas: linhas.length });
  }

  const setorDestino = db.prepare("SELECT id FROM setores WHERE id = ?").get(setor_id);
  if (!setorDestino) {
    return NextResponse.json({ error: "Setor invalido" }, { status: 400 });
  }

  const resultado = db
    .prepare("UPDATE transacoes SET setor_id = ? WHERE descricao = ? AND tipo = ? AND setor_id = ?")
    .run(setor_id, descricao, tipo, setorGeral.id);

  return NextResponse.json({ atualizadas: resultado.changes });
}
