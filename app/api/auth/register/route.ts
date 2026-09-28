import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-auth";
import "@/lib/db-salario";
import { estaBloqueado, registrarTentativaFalha, obterIpRequisicao } from "@/lib/rate-limit";
import { criarValorSessao } from "@/lib/session";

// Auto-cadastro e proposital (funcionario de campo entra sozinho, sem
// depender do admin) — nao exige login. Mas sem limite, qualquer requisicao
// automatizada criaria funcionarios em massa; o balde por IP evita isso sem
// tirar a facilidade de uso pretendida.
const MAX_CADASTROS_POR_IP = 10;
const JANELA_CADASTRO_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const chaveIp = `register:ip:${obterIpRequisicao(req)}`;
  if (estaBloqueado(chaveIp)) {
    return NextResponse.json(
      { error: "Muitos cadastros a partir deste acesso. Aguarde um pouco e tente de novo." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { nome, pin } = body;

  if (!nome || !nome.trim()) {
    return NextResponse.json({ error: "Nome e obrigatorio." }, { status: 400 });
  }
  if (!pin || !/^[0-9]{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN deve ter exatamente 4 numeros." }, { status: 400 });
  }

  const pinEmUso = db.prepare("SELECT id FROM funcionarios WHERE pin = ? AND ativo = 1").get(pin);
  if (pinEmUso) {
    return NextResponse.json({ error: "Esse PIN ja esta em uso. Escolha outro." }, { status: 409 });
  }

  registrarTentativaFalha(chaveIp, MAX_CADASTROS_POR_IP, JANELA_CADASTRO_MS);

  const stmt = db.prepare(
    "INSERT INTO funcionarios (nome, tipo, pin, tipo_contrato) VALUES (?, 'campo', ?, 'diarista')"
  );
  const result = stmt.run(nome.trim(), pin);

  const novo = db
    .prepare("SELECT id, nome, tipo FROM funcionarios WHERE id = ?")
    .get(result.lastInsertRowid) as { id: number; nome: string; tipo: string };

  const resposta = NextResponse.json(novo, { status: 201 });
  resposta.cookies.set("funcionario_id", criarValorSessao(novo.id), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return resposta;
}
