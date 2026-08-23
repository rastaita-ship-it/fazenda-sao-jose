// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";

let adminId: number;
let colaboradorId: number;

beforeAll(() => {
  const admin = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'chefe', 1)")
    .run("Admin Teste Backup");
  adminId = Number(admin.lastInsertRowid);

  const colaborador = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'campo', 1)")
    .run("Colaborador Teste Backup");
  colaboradorId = Number(colaborador.lastInsertRowid);
});

describe("GET /api/backup", () => {
  it("recusa sem sessao de admin", async () => {
    const res = await GET(new NextRequest("http://localhost/api/backup"));
    expect(res.status).toBe(403);
  });

  it("recusa colaborador nao-admin", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/backup", {
        headers: { cookie: `funcionario_id=${colaboradorId}` },
      })
    );
    expect(res.status).toBe(403);
  });

  it("bloqueia em modo de teste (banco em memoria, sem arquivo pra baixar)", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/backup", {
        headers: { cookie: `funcionario_id=${adminId}` },
      })
    );
    expect(res.status).toBe(400);
  });
});
