// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { PATCH, avancarProximaParcela } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";

let adminId: number;

beforeAll(() => {
  const resultado = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'chefe', 1)")
    .run("Admin de Teste Financiamentos");
  adminId = Number(resultado.lastInsertRowid);
});

function reqComSessao(url: string, corpo: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: `funcionario_id=${adminId}` },
    body: JSON.stringify(corpo),
  });
}

describe("avancarProximaParcela", () => {
  it("avanca 1 mes em financiamento mensal", () => {
    expect(avancarProximaParcela("2026-01-15", "mensal")).toBe("2026-02-15");
  });

  it("avanca 1 ano em financiamento anual", () => {
    expect(avancarProximaParcela("2026-03-10", "anual")).toBe("2027-03-10");
  });

  it("lida com fim de mes (31 de janeiro -> fevereiro rola pro proximo mes)", () => {
    // Comportamento esperado do Date nativo do JS: dia 31 nao existe em
    // fevereiro, entao "rola" pro dia correspondente de marco. Documentado
    // aqui pra deixar explicito, nao e um bug.
    expect(avancarProximaParcela("2026-01-31", "mensal")).toBe("2026-03-03");
  });
});

describe("PATCH /api/financiamentos/[id] - dar_baixa", () => {
  it("avanca proxima_parcela sem alterar outros campos", async () => {
    const criado = db
      .prepare(
        `INSERT INTO financiamentos_rurais (instituicao, descricao, proxima_parcela, periodicidade)
         VALUES ('Banco Teste', 'Custeio Teste', '2026-05-10', 'mensal')`
      )
      .run();
    const id = Number(criado.lastInsertRowid);

    const req = reqComSessao(`/api/financiamentos/${id}`, { dar_baixa: true });
    const res = await PATCH(req, { params: Promise.resolve({ id: String(id) }) });
    expect(res.status).toBe(200);
    const atualizado = await res.json();
    expect(atualizado.proxima_parcela).toBe("2026-06-10");
    expect(atualizado.instituicao).toBe("Banco Teste");
    expect(atualizado.descricao).toBe("Custeio Teste");
  });

  it("retorna 404 se o financiamento nao existe", async () => {
    const req = reqComSessao("/api/financiamentos/999999", { dar_baixa: true });
    const res = await PATCH(req, { params: Promise.resolve({ id: "999999" }) });
    expect(res.status).toBe(404);
  });
});
