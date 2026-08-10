import { NextRequest, NextResponse } from "next/server";
import { ehAdminLogado } from "@/lib/auth-helpers";
import { enviarParaFuncionario } from "@/lib/notificacoes";

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }
  const funcionarioId = Number(req.cookies.get("funcionario_id")?.value);

  await enviarParaFuncionario(funcionarioId, {
    titulo: "Notificações ativadas 🎉",
    corpo: "A partir de agora você recebe avisos da Fazenda São José mesmo com o app fechado.",
    url: "/",
  });

  return NextResponse.json({ ok: true });
}
