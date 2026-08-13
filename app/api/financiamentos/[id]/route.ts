import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-financiamentos";
import { ehAdminLogado } from "@/lib/auth-helpers";
import { lerCorpoJson } from "@/lib/api";

/** Avanca a data pra proxima parcela conforme a periodicidade do financiamento. */
export function avancarProximaParcela(dataISO: string, periodicidade: string): string {
  const data = new Date(dataISO + "T12:00:00");
  if (periodicidade === "anual") {
    data.setFullYear(data.getFullYear() + 1);
  } else {
    data.setMonth(data.getMonth() + 1);
  }
  return data.toISOString().slice(0, 10);
}

interface FinanciamentoRow {
  id: number;
  proxima_parcela: string;
  periodicidade: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }

  const resultado = await lerCorpoJson<Record<string, unknown>>(req);
  if (!resultado.ok) return resultado.resposta;
  const body = resultado.body;

  if (body.dar_baixa === true) {
    const atual = db
      .prepare("SELECT id, proxima_parcela, periodicidade FROM financiamentos_rurais WHERE id = ?")
      .get(id) as FinanciamentoRow | undefined;
    if (!atual) {
      return NextResponse.json({ error: "financiamento nao encontrado" }, { status: 404 });
    }
    const novaData = avancarProximaParcela(atual.proxima_parcela, atual.periodicidade);
    db.prepare("UPDATE financiamentos_rurais SET proxima_parcela = ? WHERE id = ?").run(novaData, id);
    const atualizado = db.prepare("SELECT * FROM financiamentos_rurais WHERE id = ?").get(id);
    return NextResponse.json(atualizado);
  }

  const campos: string[] = [];
  const valores: (string | number | null)[] = [];
  const permitidos = [
    "instituicao",
    "descricao",
    "valor_parcela",
    "proxima_parcela",
    "periodicidade",
    "tem_proagro",
    "observacao",
    "status",
  ];
  for (const campo of permitidos) {
    if (campo in body) {
      campos.push(`${campo} = ?`);
      valores.push(
        campo === "tem_proagro"
          ? body[campo]
            ? 1
            : 0
          : (body[campo] as string | number | null)
      );
    }
  }

  if (campos.length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });
  }
  if ("periodicidade" in body && !["mensal", "anual"].includes(body.periodicidade as string)) {
    return NextResponse.json({ error: "periodicidade invalida" }, { status: 400 });
  }
  if ("status" in body && !["ativo", "quitado"].includes(body.status as string)) {
    return NextResponse.json({ error: "status invalido" }, { status: 400 });
  }

  valores.push(id);
  db.prepare(`UPDATE financiamentos_rurais SET ${campos.join(", ")} WHERE id = ?`).run(...valores);

  const atualizado = db.prepare("SELECT * FROM financiamentos_rurais WHERE id = ?").get(id);
  return NextResponse.json(atualizado);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 });
  }

  db.prepare("DELETE FROM financiamentos_rurais WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
