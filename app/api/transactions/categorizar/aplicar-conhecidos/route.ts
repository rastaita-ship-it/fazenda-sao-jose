import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ehAdminLogado } from "@/lib/auth-helpers";

const SETOR_GERAL_NOME = "Geral/Administrativo";

/**
 * Categorizacao pontual de fornecedores ja identificados manualmente (ver conversa
 * com o Danilo sobre o extrato bancario real). Nao e uma ferramenta generica —
 * a lista fica fixa aqui porque cobre um lote especifico de fornecedores conhecidos.
 */
const GRUPOS_CAFE: [string, string][] = [
  ["Pagamento efetuado: AGROCENTER COMERCIO E REPRESENTACAO DE PRODUTOS AG", "despesa"],
  ["Pagamento efetuado: BIO SANTO AGRONEGOCIOS LTDA", "despesa"],
  ["Pix enviado: Agro Teresense LTDA", "despesa"],
  ["Pix enviado: SERAFERTIL COMERCIO VAREJISTA DE PRODUTOS", "despesa"],
  ["Pix enviado: Acqua Fertil Irrigacao Bahia LTDA", "despesa"],
  ["Pix enviado: Agro Center Comercio de Insumos Agricolas LTDA", "despesa"],
  ["Pagamento efetuado: ACQUA FERTIL IRRIGACAO BAHIA LTDA - ME", "despesa"],
  ["Pix enviado: Agrolandes Laboratorio de Analises Agronomicas LTDA", "despesa"],
  ["Pix enviado: COMATEC AGRO BAHIA", "despesa"],
  ["Pix enviado: ILHEUS AGRONEGOCIOS LTDA", "despesa"],
  ["Pix enviado: Iavant Equipamentos Industriais E Agricolas LTDA", "despesa"],
  ["Pix enviado: Instituto de Fomento E Desenvolvimento Agrosocioambiental da Bahia", "despesa"],
  ["Pix enviado: Ml Consultoria Agricola LTDA", "despesa"],
  ["Pix enviado: Santa Julia Comercio E Representacao de Produtos Agricolas LTDA", "despesa"],
  ["Pix enviado: Topoagro Engenharia LTDA", "despesa"],
];

const GRUPOS_OFICINA: [string, string][] = [
  ["Pix enviado: CASA DO JAPONES MAQUINAS E PECAS LTDA", "despesa"],
  ["Pix enviado: CASA DO JAPONES", "despesa"],
  ["Pix enviado: Casa do Japones Maquinas E Pecas LTDA", "despesa"],
  ["Pix enviado: NORTE AUTOPECAS", "despesa"],
  ["Pagamento efetuado: LIPETRAL LINHARES PECAS E TRATORES LTDA", "despesa"],
  ["Pix enviado: AF10 AUTO PECAS", "despesa"],
  ["Pix enviado: Central Comercio de Baterias LTDA", "despesa"],
  ["Pix enviado: NORTE AUTOPECAS LTDA", "despesa"],
  ["Pix enviado: PNEUSTORECOMBR", "despesa"],
  ["Pix enviado: S S Comercial de Ferramentas LTDA", "despesa"],
  ["Pix enviado: Stop Car Comercio de Pneus LTDA", "despesa"],
  ["Pix enviado: W U Comercio E Assistencia Tecnica Em Maquinas LTDA", "despesa"],
];

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const setorGeral = db.prepare("SELECT id FROM setores WHERE nome = ?").get(SETOR_GERAL_NOME) as
    | { id: number }
    | undefined;
  const setorCafe = db.prepare("SELECT id FROM setores WHERE nome = ?").get("Café") as
    | { id: number }
    | undefined;
  const setorOficina = db.prepare("SELECT id FROM setores WHERE nome = ?").get("Oficina e Manutencao") as
    | { id: number }
    | undefined;

  if (!setorGeral || !setorCafe || !setorOficina) {
    return NextResponse.json({ error: "Setor Café, Oficina e Manutencao ou Geral/Administrativo nao encontrado." }, { status: 400 });
  }

  const atualizar = db.prepare(
    "UPDATE transacoes SET setor_id = ? WHERE descricao = ? AND tipo = ? AND setor_id = ?"
  );

  let aplicadoCafe = 0;
  for (const [descricao, tipo] of GRUPOS_CAFE) {
    aplicadoCafe += atualizar.run(setorCafe.id, descricao, tipo, setorGeral.id).changes;
  }

  let aplicadoOficina = 0;
  for (const [descricao, tipo] of GRUPOS_OFICINA) {
    aplicadoOficina += atualizar.run(setorOficina.id, descricao, tipo, setorGeral.id).changes;
  }

  const restantes = db
    .prepare("SELECT COUNT(*) n FROM transacoes WHERE setor_id = ?")
    .get(setorGeral.id) as { n: number };

  return NextResponse.json({ aplicadoCafe, aplicadoOficina, restantesGeral: restantes.n });
}
