import { NextResponse } from "next/server";
import { obterChavesVapid } from "@/lib/notificacoes";

export async function GET() {
  const { publicKey } = obterChavesVapid();
  return NextResponse.json({ publicKey });
}
