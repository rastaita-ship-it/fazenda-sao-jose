import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import "@/lib/db-manejo";
import "@/lib/db-manejo-grupo";

export const dynamic = "force-dynamic";

interface ManejoRow {
  id: number;
  setor_id: number;
  atividade_nome: string;
  data_planejada: string;
  data_realizada: string | null;
  status: string;
  funcionario_id: number | null;
  observacao: string | null;
  origem: string;
  grupo_id: string;
}

/**
 * PATCH /api/manejo-grupos/:grupoId
 * Edita a atividade inteira: nome, responsavel, observacao, e o periodo
 * (data_inicio/data_fim). O periodo se auto-ajusta: remove dias que saíram
 * do novo intervalo (se ainda nao concluidos) e adiciona dias novos.
 * Body: { atividade_nome?, funcionario_id?, observacao?, data_inicio?, data_fim? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { grupoId: string } }
) {
  const grupoId = params.grupoId;
  const body = await req.json();
  const { atividade_nome, funcionario_id, observacao, data_inicio, data_fim } = body;

  const itensAtuais = db
    .prepare("SELECT * FROM manejos WHERE grupo_id = ? ORDER BY data_planejada ASC")
    .all(grupoId) as ManejoRow[];

  if (itensAtuais.length === 0) {
    return NextResponse.json({ error: "Grupo nao encontrado." }, { status: 404 });
  }

  const setorId = itensAtuais[0].setor_id;
  const origem = itensAtuais[0].origem;

  // Atualiza campos simples (nome, responsavel, observacao) em todos os dias
  const camposSimples: string[] = [];
  const valoresSimples: (string | number | null)[] = [];
  if (atividade_nome !== undefined) {
    camposSimples.push("atividade_nome = ?");
    valoresSimples.push(atividade_nome);
  }
  if (funcionario_id !== undefined) {
    camposSimples.push("funcionario_id = ?");
    valoresSimples.push(funcionario_id);
  }
  if (observacao !== undefined) {
    camposSimples.push("observacao = ?");
    valoresSimples.push(observacao);
  }
  if (camposSimples.length > 0) {
    db.prepare(`UPDATE manejos SET ${camposSimples.join(", ")} WHERE grupo_id = ?`).run(
      ...valoresSimples,
      grupoId
    );
  }

  // Se o periodo mudou, recalcula os dias
  if (data_inicio) {
    const novasDatas: string[] = [];
    const inicio = new Date(data_inicio + "T12:00:00");
    const fim = data_fim ? new Date(data_fim + "T12:00:00") : inicio;
    const atual = new Date(inicio);
    while (atual <= fim) {
      novasDatas.push(atual.toISOString().slice(0, 10));
      atual.setDate(atual.getDate() + 1);
    }

    const datasAtuais = new Set(itensAtuais.map((i) => i.data_planejada));
    const novasSet = new Set(novasDatas);

    // Remove dias que saíram do periodo (apenas os NAO concluidos, para nao perder historico)
    const paraRemover = itensAtuais.filter(
      (i) => !novasSet.has(i.data_planejada) && i.status !== "concluido"
    );
    if (paraRemover.length > 0) {
      const idsRemover = paraRemover.map((i) => i.id);
      db.prepare(`DELETE FROM manejos WHERE id IN (${idsRemover.map(() => "?").join(",")})`).run(
        ...idsRemover
      );
    }

    // Adiciona dias novos que ainda nao existiam
    const nomeFinal = atividade_nome ?? itensAtuais[0].atividade_nome;
    const funcFinal = funcionario_id !== undefined ? funcionario_id : itensAtuais[0].funcionario_id;
    const obsFinal = observacao !== undefined ? observacao : itensAtuais[0].observacao;

    const inserir = db.prepare(`
      INSERT INTO manejos (setor_id, atividade_nome, data_planejada, funcionario_id, observacao, origem, grupo_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const transacao = db.transaction(() => {
      for (const data of novasDatas) {
        if (!datasAtuais.has(data)) {
          inserir.run(setorId, nomeFinal, data, funcFinal, obsFinal, origem, grupoId);
        }
      }
    });
    transacao();
  }

  const atualizado = db
    .prepare("SELECT * FROM manejos WHERE grupo_id = ? ORDER BY data_planejada ASC")
    .all(grupoId);
  return NextResponse.json({ grupo_id: grupoId, itens: atualizado });
}

/**
 * DELETE /api/manejo-grupos/:grupoId
 * Exclui a atividade inteira, todos os dias de uma vez.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { grupoId: string } }
) {
  const grupoId = params.grupoId;
  db.prepare("DELETE FROM manejos WHERE grupo_id = ?").run(grupoId);
  return NextResponse.json({ ok: true });
}
