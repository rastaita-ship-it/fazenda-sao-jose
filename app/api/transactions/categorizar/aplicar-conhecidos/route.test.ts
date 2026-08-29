// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";

let adminId: number;
let colaboradorId: number;
let setorGeralId: number;
let setorCafeId: number;
let setorOficinaId: number;

beforeAll(() => {
  const admin = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'chefe', 1)")
    .run("Admin Teste Conhecidos");
  adminId = Number(admin.lastInsertRowid);

  const colaborador = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'campo', 1)")
    .run("Colaborador Teste Conhecidos");
  colaboradorId = Number(colaborador.lastInsertRowid);

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

  const cafe = db.prepare("SELECT id FROM setores WHERE nome = ?").get("Café") as
    | { id: number }
    | undefined;
  setorCafeId = cafe
    ? cafe.id
    : Number(db.prepare("INSERT INTO setores (nome, tipo) VALUES ('Café', 'cafe')").run().lastInsertRowid);

  const oficina = db.prepare("SELECT id FROM setores WHERE nome = ?").get("Oficina e Manutencao") as
    | { id: number }
    | undefined;
  setorOficinaId = oficina
    ? oficina.id
    : Number(
        db
          .prepare("INSERT INTO setores (nome, tipo) VALUES ('Oficina e Manutencao', 'outra_cultura')")
          .run().lastInsertRowid
      );

  const inserir = db.prepare(
    "INSERT INTO transacoes (setor_id, tipo, descricao, valor, data, status) VALUES (?, ?, ?, ?, ?, 'pago')"
  );
  inserir.run(setorGeralId, "despesa", "Pix enviado: Agro Teresense LTDA", 100, "2026-01-05");
  inserir.run(setorGeralId, "despesa", "Pix enviado: NORTE AUTOPECAS", 50, "2026-01-06");
  inserir.run(setorGeralId, "despesa", "Pix enviado: Fornecedor Nao Listado", 20, "2026-01-07");
});

function reqPost(cookie?: string) {
  return new NextRequest("http://localhost/api/transactions/categorizar/aplicar-conhecidos", {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
  });
}

describe("POST /api/transactions/categorizar/aplicar-conhecidos", () => {
  it("recusa sem sessao de admin", async () => {
    const res = await POST(reqPost());
    expect(res.status).toBe(403);
  });

  it("recusa colaborador nao-admin", async () => {
    const res = await POST(reqPost(`funcionario_id=${colaboradorId}`));
    expect(res.status).toBe(403);
  });

  it("move os fornecedores conhecidos para Café e Oficina e Manutencao", async () => {
    const res = await POST(reqPost(`funcionario_id=${adminId}`));
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.aplicadoCafe).toBe(1);
    expect(dados.aplicadoOficina).toBe(1);

    const cafe = db
      .prepare("SELECT COUNT(*) n FROM transacoes WHERE descricao = ? AND setor_id = ?")
      .get("Pix enviado: Agro Teresense LTDA", setorCafeId) as { n: number };
    expect(cafe.n).toBe(1);

    const oficina = db
      .prepare("SELECT COUNT(*) n FROM transacoes WHERE descricao = ? AND setor_id = ?")
      .get("Pix enviado: NORTE AUTOPECAS", setorOficinaId) as { n: number };
    expect(oficina.n).toBe(1);

    const naoListado = db
      .prepare("SELECT COUNT(*) n FROM transacoes WHERE descricao = ? AND setor_id = ?")
      .get("Pix enviado: Fornecedor Nao Listado", setorGeralId) as { n: number };
    expect(naoListado.n).toBe(1);
  });

  it("e idempotente: rodar de novo nao move nada a mais", async () => {
    const res = await POST(reqPost(`funcionario_id=${adminId}`));
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.aplicadoCafe).toBe(0);
    expect(dados.aplicadoOficina).toBe(0);
  });
});
