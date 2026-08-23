// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import ExcelJS from "exceljs";

let adminId: number;
let colaboradorId: number;

beforeAll(() => {
  const admin = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'chefe', 1)")
    .run("Admin Teste Planilha");
  adminId = Number(admin.lastInsertRowid);

  const colaborador = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'campo', 1)")
    .run("Colaborador Teste Planilha");
  colaboradorId = Number(colaborador.lastInsertRowid);

  const setor = db.prepare("INSERT INTO setores (nome, tipo) VALUES (?, 'cafe')").run("Setor Teste Planilha");
  db.prepare(
    "INSERT INTO transacoes (setor_id, tipo, descricao, valor, data, status) VALUES (?, 'receita', 'Venda teste', 100, '2026-01-01', 'pago')"
  ).run(Number(setor.lastInsertRowid));
});

describe("GET /api/backup/planilha", () => {
  it("recusa sem sessao de admin", async () => {
    const res = await GET(new NextRequest("http://localhost/api/backup/planilha"));
    expect(res.status).toBe(403);
  });

  it("recusa colaborador nao-admin", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/backup/planilha", {
        headers: { cookie: `funcionario_id=${colaboradorId}` },
      })
    );
    expect(res.status).toBe(403);
  });

  it("gera uma planilha xlsx valida com uma aba por tabela e os dados reais", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/backup/planilha", {
        headers: { cookie: `funcionario_id=${adminId}` },
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("spreadsheetml");

    const arrayBuffer = await res.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const abaSetores = workbook.getWorksheet("setores");
    expect(abaSetores).toBeDefined();
    const abaTransacoes = workbook.getWorksheet("transacoes");
    expect(abaTransacoes).toBeDefined();
    // linha 1 = cabecalho, linha 2 = primeiro registro
    const valoresLinha2 = (abaTransacoes!.getRow(2).values as unknown[]).filter((v) => v != null);
    expect(valoresLinha2).toContain("Venda teste");
  });
});
