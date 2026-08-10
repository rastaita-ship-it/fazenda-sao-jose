import { NextRequest, NextResponse } from "next/server";

/**
 * Le e valida o corpo JSON de uma requisicao sem deixar `req.json()` lancar
 * um erro nao tratado (que vira um 500 cru sem o formato {error} que o
 * frontend espera) quando o corpo vem vazio ou malformado — comum no
 * caminho offline/instavel do PWA.
 */
export async function lerCorpoJson<T = unknown>(
  req: NextRequest
): Promise<{ ok: true; body: T } | { ok: false; resposta: NextResponse }> {
  try {
    const body = (await req.json()) as T;
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Corpo da requisicao invalido." }, { status: 400 }),
    };
  }
}
