import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = db
    .prepare("SELECT id FROM funcionarios WHERE tipo = 'chefe' AND pin IS NOT NULL AND ativo = 1")
    .get();

  return NextResponse.json({ precisaConfigurar: !admin });
}
