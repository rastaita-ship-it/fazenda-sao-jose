// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import "@/lib/db-talhoes";

let adminId: number;
let setorId: number;
let talhaoId: number;
let funcionarioCampoId: number;

beforeAll(() => {
  const admin = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'chefe', 1)")
    .run("Admin Teste Movimentacao");
  adminId = Number(admin.lastInsertRowid);

  const campo = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'campo', 1)")
    .run("Funcionario de Campo Teste");
  funcionarioCampoId = Number(campo.lastInsertRowid);

  const setor = db
    .prepare("INSERT INTO setores (nome, tipo) VALUES (?, 'cafe')")
    .run("Setor Movimentacao Teste");
  setorId = Number(setor.lastInsertRowid);

  const talhao = db
    .prepare("INSERT INTO talhoes (setor_id, nome) VALUES (?, 'Talhao Movimentacao Teste')")
    .run(setorId);
  talhaoId = Number(talhao.lastInsertRowid);
});

function reqComSessao(corpo: unknown) {
  return new NextRequest("http://localhost/api/estoque-insumos/movimentacao", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `funcionario_id=${adminId}` },
    body: JSON.stringify(corpo),
  });
}

function criarInsumo(comSetor: boolean) {
  const result = db
    .prepare(
      "INSERT INTO estoque_insumos (nome, categoria, unidade, setor_id) VALUES (?, 'fertilizante', 'kg', ?)"
    )
    .run(`Insumo Teste ${Date.now()}-${Math.random()}`, comSetor ? setorId : null);
  return Number(result.lastInsertRowid);
}

describe("POST /api/estoque-insumos/movimentacao - despesa automatica (entrada)", () => {
  it("cria despesa vinculada usando o setor do proprio insumo", async () => {
    const insumoId = criarInsumo(true);
    const res = await POST(
      reqComSessao({
        insumo_id: insumoId,
        tipo: "entrada",
        quantidade: 10,
        data: "2026-08-01",
        custo_total: 100,
      })
    );
    expect(res.status).toBe(201);

    const mov = db
      .prepare("SELECT transacao_id FROM movimentacoes_insumo WHERE insumo_id = ?")
      .get(insumoId) as { transacao_id: number | null };
    expect(mov.transacao_id).not.toBeNull();

    const transacao = db.prepare("SELECT * FROM transacoes WHERE id = ?").get(mov.transacao_id) as {
      tipo: string;
      valor: number;
      setor_id: number;
      categoria: string;
    };
    expect(transacao.tipo).toBe("despesa");
    expect(transacao.valor).toBe(100);
    expect(transacao.setor_id).toBe(setorId);
    expect(transacao.categoria).toBe("Fertilizante");
  });

  it("nao cria despesa quando criar_lancamento e false", async () => {
    const insumoId = criarInsumo(true);
    const res = await POST(
      reqComSessao({
        insumo_id: insumoId,
        tipo: "entrada",
        quantidade: 5,
        data: "2026-08-01",
        custo_total: 50,
        criar_lancamento: false,
      })
    );
    expect(res.status).toBe(201);

    const mov = db
      .prepare("SELECT transacao_id FROM movimentacoes_insumo WHERE insumo_id = ?")
      .get(insumoId) as { transacao_id: number | null };
    expect(mov.transacao_id).toBeNull();
  });

  it("usa o setor Oficina e Manutencao quando o insumo nao tem setor", async () => {
    db.prepare("INSERT OR IGNORE INTO setores (nome, tipo) VALUES ('Oficina e Manutencao', 'outra_cultura')").run();
    const insumoId = criarInsumo(false);
    const res = await POST(
      reqComSessao({
        insumo_id: insumoId,
        tipo: "entrada",
        quantidade: 2,
        data: "2026-08-01",
        custo_total: 40,
      })
    );
    expect(res.status).toBe(201);

    const mov = db
      .prepare("SELECT transacao_id FROM movimentacoes_insumo WHERE insumo_id = ?")
      .get(insumoId) as { transacao_id: number | null };
    expect(mov.transacao_id).not.toBeNull();

    const transacao = db.prepare("SELECT setor_id FROM transacoes WHERE id = ?").get(mov.transacao_id) as {
      setor_id: number;
    };
    const oficina = db.prepare("SELECT id FROM setores WHERE nome = 'Oficina e Manutencao'").get() as {
      id: number;
    };
    expect(transacao.setor_id).toBe(oficina.id);
  });

  it("entrada sem custo_total nao cria despesa", async () => {
    const insumoId = criarInsumo(true);
    const res = await POST(
      reqComSessao({ insumo_id: insumoId, tipo: "entrada", quantidade: 3, data: "2026-08-01" })
    );
    expect(res.status).toBe(201);
    const mov = db
      .prepare("SELECT transacao_id FROM movimentacoes_insumo WHERE insumo_id = ?")
      .get(insumoId) as { transacao_id: number | null };
    expect(mov.transacao_id).toBeNull();
  });
});

describe("POST /api/estoque-insumos/movimentacao - rastreamento (saida)", () => {
  it("grava funcionario, finalidade e talhao numa saida, sem gerar despesa", async () => {
    const insumoId = criarInsumo(true);
    // Precisa ter estoque antes de poder tirar.
    await POST(reqComSessao({ insumo_id: insumoId, tipo: "entrada", quantidade: 20, data: "2026-08-01" }));

    const res = await POST(
      reqComSessao({
        insumo_id: insumoId,
        tipo: "saida",
        quantidade: 5,
        data: "2026-08-02",
        funcionario_id: funcionarioCampoId,
        finalidade: "Adubacao do talhao teste",
        talhao_id: talhaoId,
      })
    );
    expect(res.status).toBe(201);

    const mov = db
      .prepare(
        "SELECT funcionario_id, finalidade, talhao_id, transacao_id FROM movimentacoes_insumo WHERE insumo_id = ? AND tipo = 'saida'"
      )
      .get(insumoId) as {
      funcionario_id: number;
      finalidade: string;
      talhao_id: number;
      transacao_id: number | null;
    };
    expect(mov.funcionario_id).toBe(funcionarioCampoId);
    expect(mov.finalidade).toBe("Adubacao do talhao teste");
    expect(mov.talhao_id).toBe(talhaoId);
    expect(mov.transacao_id).toBeNull();
  });
});
