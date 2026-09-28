import { NextRequest } from "next/server";
import { db } from "./db";
import "./db-ponto";
import { verificarValorSessao } from "./session";

/** Le e valida a assinatura do cookie funcionario_id; null se nao logado ou adulterado. */
export function idFuncionarioSessao(req: NextRequest): number | null {
  return verificarValorSessao(req.cookies.get("funcionario_id")?.value);
}

export function ehAdminLogado(req: NextRequest): boolean {
  const funcionarioId = idFuncionarioSessao(req);
  if (!funcionarioId) return false;
  const usuario = db
    .prepare("SELECT tipo FROM funcionarios WHERE id = ? AND ativo = 1")
    .get(funcionarioId) as { tipo: string } | undefined;
  return usuario?.tipo === "chefe";
}

export function estaLogado(req: NextRequest): boolean {
  return idFuncionarioSessao(req) !== null;
}
