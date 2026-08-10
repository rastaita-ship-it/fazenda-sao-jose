import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-estoque";
import "@/lib/db-patrimonio";
import { ehAdminLogado } from "@/lib/auth-helpers";
import { parseCsv, montarCsv } from "@/lib/csv";
import { ESPECIFICACOES, TipoImportacao, validarLinha } from "@/lib/importacao";

function tipoValido(tipo: unknown): tipo is TipoImportacao {
  return typeof tipo === "string" && tipo in ESPECIFICACOES;
}

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  if (!tipoValido(tipo)) {
    return NextResponse.json({ error: "tipo invalido" }, { status: 400 });
  }

  const especificacao = ESPECIFICACOES[tipo];
  const cabecalho = especificacao.colunas.map((c) => c.chave);
  const csv = montarCsv(cabecalho, [especificacao.exemplo]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="modelo-${tipo}.csv"`,
    },
  });
}

interface LinhaResultado {
  numero: number;
  valores: Record<string, string>;
  erros: string[];
}

function inserirLinha(tipo: TipoImportacao, dados: Record<string, string | number | null>) {
  if (tipo === "patrimonio") {
    db.prepare(
      `INSERT INTO patrimonio (nome, tipo, identificador, data_aquisicao, valor_aquisicao, vida_util_meses, horimetro_km_atual, observacao)
       VALUES (@nome, @tipo, @identificador, @data_aquisicao, @valor_aquisicao, @vida_util_meses, @horimetro_km_atual, @observacao)`
    ).run(dados);
  } else if (tipo === "estoque_insumos") {
    db.prepare(
      `INSERT INTO estoque_insumos (nome, categoria, unidade, quantidade_atual, quantidade_minima, custo_unitario, setor_id, observacao)
       VALUES (@nome, @categoria, @unidade, @quantidade_atual, @quantidade_minima, @custo_unitario, @setor_id, @observacao)`
    ).run({ ...dados, quantidade_atual: dados.quantidade_atual ?? 0 });
  } else if (tipo === "estoque_producao") {
    db.prepare(
      `INSERT INTO estoque_producao (produto, setor_id, unidade, quantidade_atual, local_armazenamento, observacao)
       VALUES (@produto, @setor_id, @unidade, @quantidade_atual, @local_armazenamento, @observacao)`
    ).run({ ...dados, quantidade_atual: dados.quantidade_atual ?? 0 });
  }
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { tipo, csv, confirmar } = body;

  if (!tipoValido(tipo) || typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ error: "tipo e csv sao obrigatorios" }, { status: 400 });
  }

  const especificacao = ESPECIFICACOES[tipo];
  const linhasCsv = parseCsv(csv);
  if (linhasCsv.length === 0) {
    return NextResponse.json({ error: "Planilha vazia." }, { status: 400 });
  }

  const cabecalho = linhasCsv[0].map((c) => c.trim().toLowerCase());
  const colunasEsperadas = especificacao.colunas.map((c) => c.chave);
  const faltando = colunasEsperadas.filter((c) => !cabecalho.includes(c));
  if (faltando.length > 0) {
    return NextResponse.json(
      { error: `Cabecalho invalido. Colunas esperadas: ${colunasEsperadas.join(", ")}. Faltando: ${faltando.join(", ")}.` },
      { status: 400 }
    );
  }

  const setores = db.prepare("SELECT id, nome FROM setores WHERE ativo = 1").all() as { id: number; nome: string }[];
  const setoresPorNome = new Map(setores.map((s) => [s.nome.toLowerCase(), s.id]));

  const resultados: LinhaResultado[] = [];
  const linhasValidas: { numero: number; dados: Record<string, string | number | null> }[] = [];

  for (let i = 1; i < linhasCsv.length; i++) {
    const numero = i + 1; // numero da linha na planilha (1 = cabecalho)
    const valores: Record<string, string> = {};
    cabecalho.forEach((chave, idx) => {
      valores[chave] = linhasCsv[i][idx] ?? "";
    });

    const validacao = validarLinha(tipo, valores, setoresPorNome);
    if (validacao.ok) {
      linhasValidas.push({ numero, dados: validacao.dados });
      resultados.push({ numero, valores, erros: [] });
    } else {
      resultados.push({ numero, valores, erros: validacao.erros });
    }
  }

  if (!confirmar) {
    return NextResponse.json({
      linhas: resultados,
      total: resultados.length,
      validas: linhasValidas.length,
      invalidas: resultados.length - linhasValidas.length,
    });
  }

  const executar = db.transaction(() => {
    for (const linha of linhasValidas) {
      inserirLinha(tipo, linha.dados);
    }
  });
  executar();

  return NextResponse.json({
    inseridos: linhasValidas.length,
    ignorados: resultados.length - linhasValidas.length,
  });
}
