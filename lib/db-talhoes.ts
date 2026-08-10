import { db } from "./db";
import "./db-estoque";

db.exec(`
  CREATE TABLE IF NOT EXISTS talhoes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    setor_id      INTEGER NOT NULL REFERENCES setores(id) ON DELETE CASCADE,
    nome          TEXT NOT NULL,
    area_hectares REAL,
    observacao    TEXT,
    ativo         INTEGER NOT NULL DEFAULT 1,
    criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_talhoes_setor ON talhoes(setor_id);
`);

const colunasTransacoes = db.prepare("PRAGMA table_info(transacoes)").all() as { name: string }[];
if (!colunasTransacoes.map((c) => c.name).includes("talhao_id")) {
  db.exec("ALTER TABLE transacoes ADD COLUMN talhao_id INTEGER REFERENCES talhoes(id) ON DELETE SET NULL");
}

// Fica na movimentacao (evento de colheita/venda), nao no produto agregado:
// varios talhoes do mesmo setor alimentam o mesmo estoque_producao.
const colunasMovProducao = db.prepare("PRAGMA table_info(movimentacoes_producao)").all() as { name: string }[];
if (!colunasMovProducao.map((c) => c.name).includes("talhao_id")) {
  db.exec("ALTER TABLE movimentacoes_producao ADD COLUMN talhao_id INTEGER REFERENCES talhoes(id) ON DELETE SET NULL");
}

console.log("Tabela de talhoes e colunas relacionadas prontas.");

export function talhaoExiste(talhaoId: number): boolean {
  return !!db.prepare("SELECT 1 FROM talhoes WHERE id = ? AND ativo = 1").get(talhaoId);
}
