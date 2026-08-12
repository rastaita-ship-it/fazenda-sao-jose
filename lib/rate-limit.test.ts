// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  estaBloqueado,
  registrarTentativaFalha,
  limparTentativas,
  obterIpRequisicao,
} from "./rate-limit";

function chaveUnica() {
  return `teste:${Math.random()}`;
}

describe("rate-limit", () => {
  it("nao bloqueia uma chave nova", () => {
    expect(estaBloqueado(chaveUnica())).toBe(false);
  });

  it("bloqueia depois do numero padrao de falhas (5)", () => {
    const chave = chaveUnica();
    for (let i = 0; i < 4; i++) {
      registrarTentativaFalha(chave);
      expect(estaBloqueado(chave)).toBe(false);
    }
    registrarTentativaFalha(chave); // 5a falha
    expect(estaBloqueado(chave)).toBe(true);
  });

  it("respeita um limite customizado", () => {
    const chave = chaveUnica();
    registrarTentativaFalha(chave, 2, 60_000);
    expect(estaBloqueado(chave)).toBe(false);
    registrarTentativaFalha(chave, 2, 60_000);
    expect(estaBloqueado(chave)).toBe(true);
  });

  it("limparTentativas remove o bloqueio", () => {
    const chave = chaveUnica();
    for (let i = 0; i < 5; i++) registrarTentativaFalha(chave);
    expect(estaBloqueado(chave)).toBe(true);
    limparTentativas(chave);
    expect(estaBloqueado(chave)).toBe(false);
  });

  it("chaves diferentes nao se afetam (isolamento por PIN/IP)", () => {
    const chaveA = chaveUnica();
    const chaveB = chaveUnica();
    for (let i = 0; i < 5; i++) registrarTentativaFalha(chaveA);
    expect(estaBloqueado(chaveA)).toBe(true);
    expect(estaBloqueado(chaveB)).toBe(false);
  });

  it("desbloqueia sozinho depois que a janela de tempo passa", () => {
    vi.useFakeTimers();
    try {
      const chave = chaveUnica();
      registrarTentativaFalha(chave, 1, 1000);
      expect(estaBloqueado(chave)).toBe(true);
      vi.advanceTimersByTime(1001);
      expect(estaBloqueado(chave)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  describe("obterIpRequisicao", () => {
    function reqCom(headers: Record<string, string>) {
      return new Request("http://localhost/api/teste", { headers });
    }

    it("usa x-real-ip quando nao ha x-forwarded-for", () => {
      const req = reqCom({ "x-real-ip": "203.0.113.9" });
      expect(obterIpRequisicao(req)).toBe("203.0.113.9");
    });

    it("pega o ULTIMO ip da lista em x-forwarded-for, nao o primeiro", () => {
      // O primeiro IP da lista pode ser forjado pelo cliente; o ultimo e o
      // que o proxy confiavel da hospedagem anexa por conta propria.
      const req = reqCom({ "x-forwarded-for": "1.2.3.4, 9.9.9.9" });
      expect(obterIpRequisicao(req)).toBe("9.9.9.9");
    });

    it("retorna 'desconhecido' se nenhum header de IP existir", () => {
      const req = reqCom({});
      expect(obterIpRequisicao(req)).toBe("desconhecido");
    });
  });
});
