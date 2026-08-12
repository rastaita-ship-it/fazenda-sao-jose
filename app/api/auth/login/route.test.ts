// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import { limparTentativas } from "@/lib/rate-limit";

const PIN_VALIDO = "7391";

function requisicaoLogin(pin: unknown, ip = "198.51.100.1") {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ pin }),
  });
}

beforeAll(() => {
  db.prepare(
    "INSERT INTO funcionarios (nome, tipo, pin, ativo) VALUES (?, 'chefe', ?, 1)"
  ).run("Funcionario de Teste", PIN_VALIDO);
});

describe("POST /api/auth/login", () => {
  it("rejeita PIN incorreto com 401", async () => {
    const res = await POST(requisicaoLogin("0000", "203.0.113.10"));
    expect(res.status).toBe(401);
  });

  it("aceita o PIN correto e seta o cookie de sessao", async () => {
    const res = await POST(requisicaoLogin(PIN_VALIDO, "203.0.113.11"));
    expect(res.status).toBe(200);
    const corpo = await res.json();
    expect(corpo.nome).toBe("Funcionario de Teste");
    expect(res.cookies.get("funcionario_id")?.value).toBeTruthy();
  });

  it("bloqueia com 429 depois de 5 PINs errados do mesmo IP", async () => {
    const ip = "203.0.113.12";
    limparTentativas(`login:ip:${ip}`);
    limparTentativas("login:pin:0000");
    for (let i = 0; i < 5; i++) {
      const res = await POST(requisicaoLogin("0000", ip));
      expect(res.status).toBe(401);
    }
    const bloqueado = await POST(requisicaoLogin("0000", ip));
    expect(bloqueado.status).toBe(429);
  });

  it("mesmo com IP forjado a cada tentativa, o balde por PIN ainda trava", async () => {
    // Confirma a defesa contra spoofing de X-Forwarded-For: mesmo trocando
    // de IP a cada request, bater repetidamente no MESMO pin errado trava.
    const pinAlvo = "1234";
    for (let i = 0; i < 5; i++) {
      const res = await POST(requisicaoLogin(pinAlvo, `192.0.2.${i}`));
      expect(res.status).toBe(401);
    }
    const bloqueado = await POST(requisicaoLogin(pinAlvo, "192.0.2.99"));
    expect(bloqueado.status).toBe(429);
  });

  it("retorna 400 (nao 500) para corpo JSON invalido", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.20" },
      body: "isso-nao-e-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
