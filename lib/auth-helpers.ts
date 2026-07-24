import { NextRequest } from "next/server";
import { db } from "./db";
import "./db-ponto";

export function ehAdminLogado(req: NextRequest): boolean {
  const funcionarioId = req.cookies.get("funcionario_id")?.value;
  if (!funcionarioId) return false;
  const usuario = db
    .prepare("SELECT tipo FROM funcionarios WHERE id = ? AND ativo = 1")
    .get(funcionarioId) as { tipo: string } | undefined;
  return usuario?.tipo === "chefe";
}

export function estaLogado(req: NextRequest): boolean {
  return !!req.cookies.get("funcionario_id")?.value;
}
