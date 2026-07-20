import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-ponto";
import "@/lib/db-ponto-geo";
import { JORNADA_PADRAO_HORAS } from "@/lib/jornada";

export const dynamic = "force-dynamic";

interface RegistroBruto {
  id: number;
  funcionario_id: number;
  tipo: "entrada" | "saida";
  data_hora: string;
}

interface ResumoDia {
  data: string;
  horasTrabalhadas: number;
  horasEsperadas: number;
  saldo: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const funcionarioId = searchParams.get("funcionario_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!funcionarioId) {
    return NextResponse.json({ error: "funcionario_id é obrigatório." }, { status: 400 });
  }

  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

  const registros = db
    .prepare(
      `SELECT id, funcionario_id, tipo, data_hora FROM registros_ponto
       WHERE funcionario_id = ? AND date(data_hora) BETWEEN ? AND ?
       ORDER BY data_hora ASC`
    )
    .all(funcionarioId, from ?? defaultFrom, to ?? defaultTo) as RegistroBruto[];

  const porDia = new Map<string, RegistroBruto[]>();
  for (const r of registros) {
    const dia = r.data_hora.slice(0, 10);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia)!.push(r);
  }

  const resumoPorDia: ResumoDia[] = [];
  let saldoTotalMinutos = 0;

  for (const [dia, regs] of porDia.entries()) {
    let minutosTrabalhados = 0;
    for (let i = 0; i < regs.length - 1; i++) {
      if (regs[i].tipo === "entrada" && regs[i + 1].tipo === "saida") {
        const inicio = new Date(regs[i].data_hora.replace(" ", "T")).getTime();
        const fim = new Date(regs[i + 1].data_hora.replace(" ", "T")).getTime();
        minutosTrabalhados += (fim - inicio) / 60000;
        i++;
      }
    }

    const diaSemana = new Date(dia + "T12:00:00").getDay();
    const horasEsperadas = JORNADA_PADRAO_HORAS[diaSemana] ?? 0;
    const horasTrabalhadas = minutosTrabalhados / 60;
    const saldo = horasTrabalhadas - horasEsperadas;

    resumoPorDia.push({
      data: dia,
      horasTrabalhadas: Number(horasTrabalhadas.toFixed(2)),
      horasEsperadas,
      saldo: Number(saldo.toFixed(2)),
    });

    saldoTotalMinutos += (horasTrabalhadas - horasEsperadas) * 60;
  }

  resumoPorDia.sort((a, b) => a.data.localeCompare(b.data));

  return NextResponse.json({
    funcionario_id: Number(funcionarioId),
    periodo: { from: from ?? defaultFrom, to: to ?? defaultTo },
    saldoTotalHoras: Number((saldoTotalMinutos / 60).toFixed(2)),
    porDia: resumoPorDia,
  });
}
