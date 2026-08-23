// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import { SETOR_INVESTIMENTOS_NOME } from "@/lib/financeiro";

let userId: number;
let setorCafeId: number;

beforeAll(() => {
  const user = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'campo', 1)")
    .run("Usuario Teste Resumo");
  userId = Number(user.lastInsertRowid);

  const cafe = db
    .prepare("INSERT INTO setores (nome, tipo) VALUES (?, 'cafe')")
    .run("Setor Cafe Teste Resumo");
  setorCafeId = Number(cafe.lastInsertRowid);

  const investimentos = db.prepare("SELECT id FROM setores WHERE nome = ?").get(SETOR_INVESTIMENTOS_NOME) as
    | { id: number }
    | undefined;
  const investimentosId = investimentos
    ? investimentos.id
    : Number(
        db
          .prepare("INSERT INTO setores (nome, tipo) VALUES (?, 'outra_cultura')")
          .run(SETOR_INVESTIMENTOS_NOME).lastInsertRowid
      );

  const inserir = db.prepare(
    "INSERT INTO transacoes (setor_id, tipo, descricao, valor, data, status) VALUES (?, ?, ?, ?, '2026-03-15', 'pago')"
  );
  inserir.run(setorCafeId, "receita", "Venda de cafe teste", 1000);
  inserir.run(setorCafeId, "despesa", "Adubo teste", 200);
  // Aporte de capital do proprietario: nao pode contar como receita/despesa da fazenda
  inserir.run(investimentosId, "receita", "Pix recebido: Aporte teste", 50000);
  inserir.run(investimentosId, "despesa", "Compra de imovel teste", 300000);
});

function reqComSessao() {
  return new NextRequest("http://localhost/api/summary?from=2026-03-01&to=2026-03-31", {
    headers: { cookie: `funcionario_id=${userId}` },
  });
}

describe("GET /api/summary - exclusao de Investimentos e Aportes", () => {
  it("nao conta aporte/compra de imovel na receita e despesa da fazenda", async () => {
    const res = await GET(reqComSessao());
    expect(res.status).toBe(200);
    const resumo = await res.json();

    expect(resumo.totalReceitas).toBe(1000);
    expect(resumo.totalDespesas).toBe(200);
    expect(resumo.saldo).toBe(800);
  });

  it("nao inclui Investimentos e Aportes na lista por setor", async () => {
    const res = await GET(reqComSessao());
    const resumo = await res.json();
    const nomes = resumo.porSetor.map((s: { nome: string }) => s.nome);
    expect(nomes).not.toContain(SETOR_INVESTIMENTOS_NOME);
  });
});
