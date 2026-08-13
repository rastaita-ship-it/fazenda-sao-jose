// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import "@/lib/db-animais";

let adminId: number;
let setorId: number;
let talhaoId: number;

beforeAll(() => {
  const admin = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'chefe', 1)")
    .run("Admin de Teste Lotacao");
  adminId = Number(admin.lastInsertRowid);

  const setor = db
    .prepare("INSERT INTO setores (nome, tipo) VALUES (?, 'gado')")
    .run("Setor Lotacao Teste");
  setorId = Number(setor.lastInsertRowid);

  const talhao = db
    .prepare("INSERT INTO talhoes (setor_id, nome, area_hectares) VALUES (?, 'Piquete Teste', 10)")
    .run(setorId);
  talhaoId = Number(talhao.lastInsertRowid);

  // 2 animais pesados (900kg no total = 2 UA) + 1 sem peso registrado (nao deve entrar na soma)
  const animal1 = db
    .prepare(
      "INSERT INTO animais (setor_id, talhao_id, identificacao, especie, sexo, status) VALUES (?, ?, 'A1', 'bovino', 'femea', 'ativo')"
    )
    .run(setorId, talhaoId);
  const animal2 = db
    .prepare(
      "INSERT INTO animais (setor_id, talhao_id, identificacao, especie, sexo, status) VALUES (?, ?, 'A2', 'bovino', 'femea', 'ativo')"
    )
    .run(setorId, talhaoId);
  db.prepare(
    "INSERT INTO animais (setor_id, talhao_id, identificacao, especie, sexo, status) VALUES (?, ?, 'A3', 'bovino', 'femea', 'ativo')"
  ).run(setorId, talhaoId);

  db.prepare("INSERT INTO animais_pesagens (animal_id, peso_kg, data) VALUES (?, 450, '2026-01-01')").run(
    Number(animal1.lastInsertRowid)
  );
  db.prepare("INSERT INTO animais_pesagens (animal_id, peso_kg, data) VALUES (?, 450, '2026-01-01')").run(
    Number(animal2.lastInsertRowid)
  );
});

function reqComSessao() {
  return new NextRequest("http://localhost/api/talhoes/resumo", {
    headers: { cookie: `funcionario_id=${adminId}` },
  });
}

describe("GET /api/talhoes/resumo - lotacao UA/ha", () => {
  it("calcula UA/ha considerando so animais com peso registrado", async () => {
    const res = await GET(reqComSessao());
    expect(res.status).toBe(200);
    const talhoes = await res.json();
    const talhao = talhoes.find((t: { id: number }) => t.id === talhaoId);
    expect(talhao).toBeDefined();
    // (450 + 450) / 450 = 2 UA ; 2 UA / 10 ha = 0.2 UA/ha
    expect(talhao.lotacao_ua_ha).toBeCloseTo(0.2);
    expect(talhao.qtd_animais_pesados).toBe(2);
    expect(talhao.qtd_animais_total).toBe(3);
  });
});
