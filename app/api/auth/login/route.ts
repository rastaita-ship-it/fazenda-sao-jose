import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import { estaBloqueado, registrarTentativaFalha, limparTentativas, obterIpRequisicao } from "@/lib/rate-limit";

interface FuncionarioComPin {
  id: number;
  nome: string;
  tipo: string;
  pin: string;
}

// Bloqueio global independente de IP: como o X-Forwarded-For pode ser
// forjado pelo cliente (um IP novo a cada tentativa burlaria o limite por
// IP), esse balde extra nao depende de nenhum valor que o cliente controla.
// O limite e bem mais alto porque conta tentativas erradas de TODOS os
// funcionarios da fazenda ao mesmo tempo.
const CHAVE_GLOBAL = "login:global";
const MAX_TENTATIVAS_GLOBAL = 30;
const JANELA_GLOBAL_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const chaveIp = `login:ip:${obterIpRequisicao(req)}`;
  if (estaBloqueado(chaveIp) || estaBloqueado(CHAVE_GLOBAL)) {
    return NextResponse.json(
      { error: "Muitas tentativas erradas. Aguarde alguns minutos e tente novamente." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { pin } = body;

  if (!pin) {
    return NextResponse.json({ error: "Informe o PIN." }, { status: 400 });
  }

  const chavePin = `login:pin:${pin}`;
  if (estaBloqueado(chavePin)) {
    return NextResponse.json(
      { error: "Muitas tentativas erradas. Aguarde alguns minutos e tente novamente." },
      { status: 429 }
    );
  }

  const funcionario = db
    .prepare("SELECT id, nome, tipo, pin FROM funcionarios WHERE pin = ? AND ativo = 1")
    .get(pin) as FuncionarioComPin | undefined;

  if (!funcionario) {
    registrarTentativaFalha(chaveIp);
    registrarTentativaFalha(chavePin);
    registrarTentativaFalha(CHAVE_GLOBAL, MAX_TENTATIVAS_GLOBAL, JANELA_GLOBAL_MS);
    return NextResponse.json({ error: "PIN incorreto." }, { status: 401 });
  }

  limparTentativas(chaveIp);
  limparTentativas(chavePin);

  const resposta = NextResponse.json({
    id: funcionario.id,
    nome: funcionario.nome,
    tipo: funcionario.tipo,
  });

  resposta.cookies.set("funcionario_id", String(funcionario.id), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return resposta;
}
