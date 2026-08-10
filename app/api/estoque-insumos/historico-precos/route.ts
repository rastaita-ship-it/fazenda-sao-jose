import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-historico-precos";
import { ehAdminLogado } from "@/lib/auth-helpers";

interface Compra {
  id: number;
  data: string;
  quantidade: number;
  custo_total: number | null;
  preco_unitario: number | null;
  fornecedor: string | null;
  descricao: string | null;
}

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const insumoId = searchParams.get("insumo_id");
  if (!insumoId) {
    return NextResponse.json({ error: "insumo_id e obrigatorio" }, { status: 400 });
  }

  const compras = db
    .prepare(
      `SELECT id, data, quantidade, custo_total, preco_unitario, fornecedor, descricao
       FROM movimentacoes_insumo
       WHERE insumo_id = ? AND tipo = 'entrada' AND preco_unitario IS NOT NULL
       ORDER BY data DESC, id DESC`
    )
    .all(Number(insumoId)) as Compra[];

  const porFornecedor = new Map<
    string,
    { fornecedor: string; compras: number; menorPreco: number; maiorPreco: number; somaPrecos: number; ultimaCompra: string }
  >();

  for (const c of compras) {
    const chave = c.fornecedor?.trim() || "Nao informado";
    const atual = porFornecedor.get(chave);
    if (!atual) {
      porFornecedor.set(chave, {
        fornecedor: chave,
        compras: 1,
        menorPreco: c.preco_unitario!,
        maiorPreco: c.preco_unitario!,
        somaPrecos: c.preco_unitario!,
        ultimaCompra: c.data,
      });
    } else {
      atual.compras += 1;
      atual.menorPreco = Math.min(atual.menorPreco, c.preco_unitario!);
      atual.maiorPreco = Math.max(atual.maiorPreco, c.preco_unitario!);
      atual.somaPrecos += c.preco_unitario!;
      if (c.data > atual.ultimaCompra) atual.ultimaCompra = c.data;
    }
  }

  const fornecedores = Array.from(porFornecedor.values())
    .map((f) => ({ ...f, precoMedio: f.somaPrecos / f.compras }))
    .sort((a, b) => a.precoMedio - b.precoMedio);

  return NextResponse.json({ compras, fornecedores });
}
