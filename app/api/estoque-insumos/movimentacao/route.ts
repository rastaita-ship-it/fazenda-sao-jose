import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-estoque";
import "@/lib/db-historico-precos";
import { ehAdminLogado } from "@/lib/auth-helpers";
import { enviarParaAdmins } from "@/lib/notificacoes";

export async function GET(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const insumoId = searchParams.get("insumo_id");

  let query = "SELECT * FROM movimentacoes_insumo WHERE 1 = 1";
  const params: (string | number)[] = [];
  if (insumoId) {
    query += " AND insumo_id = ?";
    params.push(Number(insumoId));
  }
  query += " ORDER BY data DESC, id DESC LIMIT 100";

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const body = await req.json();
  const { insumo_id, tipo, quantidade, data, descricao, custo_total, fornecedor } = body;

  if (!insumo_id || !tipo || !quantidade || !data) {
    return NextResponse.json(
      { error: "insumo_id, tipo, quantidade e data sao obrigatorios" },
      { status: 400 }
    );
  }
  if (!["entrada", "saida"].includes(tipo)) {
    return NextResponse.json({ error: "tipo invalido" }, { status: 400 });
  }

  const insumo = db.prepare("SELECT * FROM estoque_insumos WHERE id = ?").get(insumo_id) as
    | { nome: string; quantidade_atual: number; quantidade_minima: number | null; unidade: string }
    | undefined;
  if (!insumo) {
    return NextResponse.json({ error: "insumo nao encontrado" }, { status: 404 });
  }

  const quantidadeNum = Number(quantidade);
  if (tipo === "saida" && quantidadeNum > insumo.quantidade_atual) {
    return NextResponse.json(
      { error: `Estoque insuficiente. Disponivel: ${insumo.quantidade_atual}` },
      { status: 400 }
    );
  }

  const custoTotalNum = custo_total != null && custo_total !== "" ? Number(custo_total) : null;
  const precoUnitario = custoTotalNum != null ? custoTotalNum / quantidadeNum : null;

  const transacao = db.transaction(() => {
    db.prepare(
      `INSERT INTO movimentacoes_insumo (insumo_id, tipo, quantidade, data, descricao, custo_total, fornecedor, preco_unitario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(insumo_id, tipo, quantidadeNum, data, descricao ?? null, custoTotalNum, fornecedor ?? null, precoUnitario);

    const delta = tipo === "entrada" ? quantidadeNum : -quantidadeNum;
    db.prepare("UPDATE estoque_insumos SET quantidade_atual = quantidade_atual + ? WHERE id = ?").run(
      delta,
      insumo_id
    );

    if (tipo === "entrada" && precoUnitario != null) {
      db.prepare("UPDATE estoque_insumos SET custo_unitario = ? WHERE id = ?").run(precoUnitario, insumo_id);
    }
  });
  transacao();

  const atualizado = db.prepare("SELECT * FROM estoque_insumos WHERE id = ?").get(insumo_id) as {
    quantidade_atual: number;
  };

  const antesEstavaAcimaDoMinimo = insumo.quantidade_minima == null || insumo.quantidade_atual > insumo.quantidade_minima;
  const agoraEstaNoOuAbaixoDoMinimo =
    insumo.quantidade_minima != null && atualizado.quantidade_atual <= insumo.quantidade_minima;
  if (tipo === "saida" && antesEstavaAcimaDoMinimo && agoraEstaNoOuAbaixoDoMinimo) {
    enviarParaAdmins({
      titulo: `Estoque baixo: ${insumo.nome}`,
      corpo: `Restam ${atualizado.quantidade_atual} ${insumo.unidade} (minimo: ${insumo.quantidade_minima}).`,
      url: "/estoque",
    }).catch((e) => console.error("Falha ao notificar estoque baixo:", e));
  }

  return NextResponse.json(atualizado, { status: 201 });
}
