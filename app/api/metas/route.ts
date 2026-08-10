import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-metas";
import { ehAdminLogado } from "@/lib/auth-helpers";

interface Meta {
  id: number;
  titulo: string;
  tipo: string;
  setor_id: number | null;
  produto_id: number | null;
  valor_meta: number;
  data_inicio: string;
  data_fim: string;
  observacao: string | null;
  status: string;
}

function calcularProgresso(meta: Meta): number {
  if (meta.tipo === "lucro") {
    let query = `SELECT COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END), 0) AS total
                 FROM transacoes WHERE data BETWEEN ? AND ?`;
    const params: (string | number)[] = [meta.data_inicio, meta.data_fim];
    if (meta.setor_id) {
      query += " AND setor_id = ?";
      params.push(meta.setor_id);
    }
    const row = db.prepare(query).get(...params) as { total: number };
    return row.total;
  }
  if (meta.tipo === "receita") {
    let query = `SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes
                 WHERE tipo = 'receita' AND data BETWEEN ? AND ?`;
    const params: (string | number)[] = [meta.data_inicio, meta.data_fim];
    if (meta.setor_id) {
      query += " AND setor_id = ?";
      params.push(meta.setor_id);
    }
    const row = db.prepare(query).get(...params) as { total: number };
    return row.total;
  }
  // producao
  if (!meta.produto_id) return 0;
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(quantidade), 0) AS total FROM movimentacoes_producao
       WHERE tipo = 'entrada' AND produto_id = ? AND data BETWEEN ? AND ?`
    )
    .get(meta.produto_id, meta.data_inicio, meta.data_fim) as { total: number };
  return row.total;
}

function enriquecer(meta: Meta) {
  const progressoAtual = calcularProgresso(meta);
  const progressoPct = Math.max(0, Math.round((progressoAtual / meta.valor_meta) * 100));

  const hoje = new Date().toISOString().slice(0, 10);
  const inicio = new Date(meta.data_inicio + "T00:00:00").getTime();
  const fim = new Date(meta.data_fim + "T00:00:00").getTime();
  const agora = new Date(hoje + "T00:00:00").getTime();
  const diasTotais = Math.max(1, Math.round((fim - inicio) / 86400000));
  const diasPassados = Math.min(diasTotais, Math.max(0, Math.round((agora - inicio) / 86400000)));
  const ritmoEsperadoPct = Math.round((diasPassados / diasTotais) * 100);
  const diasRestantes = Math.max(0, Math.round((fim - agora) / 86400000));

  return {
    ...meta,
    progresso_atual: progressoAtual,
    progresso_pct: progressoPct,
    ritmo_esperado_pct: ritmoEsperadoPct,
    dias_restantes: diasRestantes,
    no_ritmo: progressoPct >= ritmoEsperadoPct - 10 || progressoPct >= 100,
  };
}

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "ativa";

  const metas = db
    .prepare(
      `SELECT m.*, s.nome AS setor_nome, s.cor AS setor_cor, p.produto AS produto_nome, p.unidade AS produto_unidade
       FROM metas m
       LEFT JOIN setores s ON s.id = m.setor_id
       LEFT JOIN estoque_producao p ON p.id = m.produto_id
       WHERE m.status = ?
       ORDER BY m.data_fim ASC`
    )
    .all(status) as (Meta & { setor_nome: string | null; setor_cor: string | null; produto_nome: string | null; produto_unidade: string | null })[];

  return NextResponse.json(metas.map(enriquecer));
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { titulo, tipo, setor_id, produto_id, valor_meta, data_inicio, data_fim, observacao } = body;

  if (!titulo || !tipo || !valor_meta || !data_inicio || !data_fim) {
    return NextResponse.json(
      { error: "Campos obrigatorios: titulo, tipo, valor_meta, data_inicio, data_fim" },
      { status: 400 }
    );
  }
  if (!["lucro", "receita", "producao"].includes(tipo)) {
    return NextResponse.json({ error: "tipo invalido" }, { status: 400 });
  }
  if (tipo === "producao" && !produto_id) {
    return NextResponse.json({ error: "Metas de producao precisam de um produto vinculado." }, { status: 400 });
  }
  if (data_fim < data_inicio) {
    return NextResponse.json({ error: "data_fim deve ser depois de data_inicio" }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO metas (titulo, tipo, setor_id, produto_id, valor_meta, data_inicio, data_fim, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    titulo,
    tipo,
    tipo === "producao" ? null : setor_id ?? null,
    tipo === "producao" ? produto_id : null,
    Number(valor_meta),
    data_inicio,
    data_fim,
    observacao ?? null
  );

  const novo = db
    .prepare(
      `SELECT m.*, s.nome AS setor_nome, s.cor AS setor_cor, p.produto AS produto_nome, p.unidade AS produto_unidade
       FROM metas m
       LEFT JOIN setores s ON s.id = m.setor_id
       LEFT JOIN estoque_producao p ON p.id = m.produto_id
       WHERE m.id = ?`
    )
    .get(result.lastInsertRowid) as Meta & { setor_nome: string | null; setor_cor: string | null; produto_nome: string | null; produto_unidade: string | null };

  return NextResponse.json(enriquecer(novo), { status: 201 });
}
