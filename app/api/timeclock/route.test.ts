// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-ponto-chave";
import "@/lib/db-auth";
import { FAZENDA_COORDENADAS } from "@/lib/geo";

let funcionarioId: number;

beforeAll(() => {
  const resultado = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'campo', 1)")
    .run("Funcionario do Ponto");
  funcionarioId = Number(resultado.lastInsertRowid);
});

interface InitSimples {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

function reqSemSessao(url: string, init?: InitSimples) {
  return new NextRequest(`http://localhost${url}`, init);
}

function reqComSessao(url: string, init: InitSimples = {}) {
  return new NextRequest(`http://localhost${url}`, {
    ...init,
    headers: { ...init.headers, cookie: `funcionario_id=${funcionarioId}` },
  });
}

describe("GET/POST /api/timeclock", () => {
  it("GET sem sessao retorna 401", async () => {
    const res = await GET(reqSemSessao("/api/timeclock"));
    expect(res.status).toBe(401);
  });

  it("POST sem sessao retorna 401", async () => {
    const res = await POST(
      reqSemSessao("/api/timeclock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ funcionario_id: funcionarioId, latitude: 1, longitude: 1 }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("bloqueia o ponto se a localizacao estiver fora da fazenda", async () => {
    const res = await POST(
      reqComSessao("/api/timeclock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ funcionario_id: funcionarioId, latitude: -1, longitude: -1 }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("registra o ponto dentro da fazenda e nao duplica com a mesma chave_cliente", async () => {
    const corpo = {
      funcionario_id: funcionarioId,
      latitude: FAZENDA_COORDENADAS.latitude,
      longitude: FAZENDA_COORDENADAS.longitude,
      chave_cliente: "chave-teste-unica-123",
    };
    const req1 = reqComSessao("/api/timeclock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(201);
    const registro1 = await res1.json();

    // Simula a fila offline reenviando o MESMO item (ex: resposta perdida
    // por sinal instavel, mas o servidor ja tinha gravado da primeira vez).
    const req2 = reqComSessao("/api/timeclock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200); // devolve o registro existente, nao cria outro
    const registro2 = await res2.json();
    expect(registro2.id).toBe(registro1.id);

    const total = db
      .prepare("SELECT COUNT(*) AS n FROM registros_ponto WHERE chave_cliente = ?")
      .get("chave-teste-unica-123") as { n: number };
    expect(total.n).toBe(1);
  });
});
