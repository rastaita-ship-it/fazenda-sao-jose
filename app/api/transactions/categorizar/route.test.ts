// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import "@/lib/db-custos";
import "@/lib/db-talhoes";

let adminId: number;
let setorGeralId: number;
let setorCafeId: number;
let setorGadoId: number;

beforeAll(() => {
  const admin = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'chefe', 1)")
    .run("Admin Teste Categorizar");
  adminId = Number(admin.lastInsertRowid);

  const geral = db.prepare("SELECT id FROM setores WHERE nome = ?").get("Geral/Administrativo") as
    | { id: number }
    | undefined;
  setorGeralId = geral
    ? geral.id
    : Number(
        db
          .prepare("INSERT INTO setores (nome, tipo) VALUES ('Geral/Administrativo', 'outra_cultura')")
          .run().lastInsertRowid
      );

  const cafe = db
    .prepare("INSERT INTO setores (nome, tipo) VALUES (?, 'cafe')")
    .run("Setor Cafe Teste Categorizar");
  setorCafeId = Number(cafe.lastInsertRowid);

  const gado = db
    .prepare("INSERT INTO setores (nome, tipo) VALUES (?, 'gado')")
    .run("Setor Gado Teste Categorizar");
  setorGadoId = Number(gado.lastInsertRowid);

  const inserir = db.prepare(
    "INSERT INTO transacoes (setor_id, tipo, descricao, valor, data, status) VALUES (?, ?, ?, ?, ?, 'pago')"
  );
  inserir.run(setorGeralId, "despesa", "Pix enviado: Fornecedor Teste X", 100, "2026-01-05");
  inserir.run(setorGeralId, "despesa", "Pix enviado: Fornecedor Teste X", 200, "2026-01-06");
  inserir.run(setorGeralId, "receita", "Pix recebido: Cliente Teste Y", 500, "2026-01-07");
  inserir.run(setorGeralId, "despesa", "Pix enviado: Diarista Teste Z", 100, "2026-01-08");
});

function reqComSessao(url: string) {
  return new NextRequest(url, { headers: { cookie: `funcionario_id=${adminId}` } });
}

describe("GET /api/transactions/categorizar", () => {
  it("agrupa transacoes pendentes por descricao e tipo", async () => {
    const res = await GET(reqComSessao("http://localhost/api/transactions/categorizar"));
    expect(res.status).toBe(200);
    const dados = await res.json();

    const grupo = dados.grupos.find(
      (g: { descricao: string; tipo: string }) =>
        g.descricao === "Pix enviado: Fornecedor Teste X" && g.tipo === "despesa"
    );
    expect(grupo).toBeDefined();
    expect(grupo.qtd).toBe(2);
    expect(grupo.total).toBe(300);

    expect(dados.setores.some((s: { nome: string }) => s.nome === "Geral/Administrativo")).toBe(false);
  });

  it("recusa sem sessao de admin", async () => {
    const res = await GET(new NextRequest("http://localhost/api/transactions/categorizar"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/transactions/categorizar", () => {
  it("move todas as transacoes do grupo para o setor escolhido", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/transactions/categorizar", {
        method: "POST",
        headers: { cookie: `funcionario_id=${adminId}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: "Pix enviado: Fornecedor Teste X",
          tipo: "despesa",
          setor_id: setorCafeId,
        }),
      })
    );
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.atualizadas).toBe(2);

    const restantes = db
      .prepare("SELECT COUNT(*) n FROM transacoes WHERE descricao = ? AND setor_id = ?")
      .get("Pix enviado: Fornecedor Teste X", setorGeralId) as { n: number };
    expect(restantes.n).toBe(0);

    const movidas = db
      .prepare("SELECT COUNT(*) n FROM transacoes WHERE descricao = ? AND setor_id = ?")
      .get("Pix enviado: Fornecedor Teste X", setorCafeId) as { n: number };
    expect(movidas.n).toBe(2);
  });

  it("rejeita setor_id invalido", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/transactions/categorizar", {
        method: "POST",
        headers: { cookie: `funcionario_id=${adminId}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: "Pix recebido: Cliente Teste Y",
          tipo: "receita",
          setor_id: 999999,
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejeita corpo sem descricao/tipo/setor_id", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/transactions/categorizar", {
        method: "POST",
        headers: { cookie: `funcionario_id=${adminId}`, "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: "Pix recebido: Cliente Teste Y" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("divide o lancamento entre setores por percentual (rateio)", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/transactions/categorizar", {
        method: "POST",
        headers: { cookie: `funcionario_id=${adminId}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: "Pix enviado: Diarista Teste Z",
          tipo: "despesa",
          rateio: [
            { setor_id: setorCafeId, percentual: 95 },
            { setor_id: setorGadoId, percentual: 5 },
          ],
        }),
      })
    );
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.atualizadas).toBe(1);

    const linhas = db
      .prepare(
        "SELECT setor_id, valor FROM transacoes WHERE descricao = ? ORDER BY setor_id"
      )
      .all("Pix enviado: Diarista Teste Z") as { setor_id: number; valor: number }[];
    expect(linhas.length).toBe(2);
    const totalDividido = linhas.reduce((soma, l) => soma + l.valor, 0);
    expect(totalDividido).toBe(100);

    const linhaCafe = linhas.find((l) => l.setor_id === setorCafeId);
    const linhaGado = linhas.find((l) => l.setor_id === setorGadoId);
    expect(linhaCafe?.valor).toBe(95);
    expect(linhaGado?.valor).toBe(5);
  });

  it("rejeita rateio cujos percentuais nao somam 100", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/transactions/categorizar", {
        method: "POST",
        headers: { cookie: `funcionario_id=${adminId}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: "Pix recebido: Cliente Teste Y",
          tipo: "receita",
          rateio: [
            { setor_id: setorCafeId, percentual: 60 },
            { setor_id: setorGadoId, percentual: 30 },
          ],
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejeita rateio com menos de 2 setores", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/transactions/categorizar", {
        method: "POST",
        headers: { cookie: `funcionario_id=${adminId}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: "Pix recebido: Cliente Teste Y",
          tipo: "receita",
          rateio: [{ setor_id: setorCafeId, percentual: 100 }],
        }),
      })
    );
    expect(res.status).toBe(400);
  });
});
