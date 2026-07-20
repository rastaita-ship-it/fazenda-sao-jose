import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-auth";

export const dynamic = "force-dynamic";

interface FuncionarioComPin {
  id: number;
  nome: string;
  tipo: string;
  pin: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pin } = body;

  if (!pin) {
    return NextResponse.json({ error: "Informe o PIN." }, { status: 400 });
  }

  const funcionario = db
    .prepare("SELECT id, nome, tipo, pin FROM funcionarios WHERE pin = ? AND ativo = 1")
    .get(pin) as FuncionarioComPin | undefined;

  if (!funcionario) {
    return NextResponse.json({ error: "PIN incorreto." }, { status: 401 });
  }

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
