// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import { limparTentativas } from "@/lib/rate-limit";

let adminId: number;

beforeAll(() => {
  const admin = db
    .prepare("INSERT INTO funcionarios (nome, tipo, ativo) VALUES (?, 'chefe', 1)")
    .run("Admin Teste OCR");
  adminId = Number(admin.lastInsertRowid);
});

function reqComArquivo(arquivo: File | null) {
  const formData = new FormData();
  if (arquivo) formData.append("arquivo", arquivo);
  return new NextRequest("http://localhost/api/transactions/ocr", {
    method: "POST",
    headers: { cookie: `funcionario_id=${adminId}` },
    body: formData,
  });
}

describe("POST /api/transactions/ocr", () => {
  it("rejeita arquivo maior que 10MB antes de chamar a IA", async () => {
    const grande = new File([new Uint8Array(11 * 1024 * 1024)], "grande.png", { type: "image/png" });
    const res = await POST(reqComArquivo(grande));
    expect(res.status).toBe(400);
    const corpo = await res.json();
    expect(corpo.error).toMatch(/muito grande/i);
  });

  it("bloqueia com 429 depois de muitas leituras seguidas (protege custo da API)", async () => {
    limparTentativas(`ocr-recibo:${adminId}`);
    const pequeno = new File([new Uint8Array(10)], "recibo.png", { type: "image/png" });

    for (let i = 0; i < 15; i++) {
      const res = await POST(reqComArquivo(pequeno));
      // sem ANTHROPIC_API_KEY no ambiente de teste, cada chamada valida
      // ainda conta pro limite mesmo retornando 500 antes de chegar na IA.
      expect(res.status).not.toBe(429);
    }
    const bloqueado = await POST(reqComArquivo(pequeno));
    expect(bloqueado.status).toBe(429);
  });
});
