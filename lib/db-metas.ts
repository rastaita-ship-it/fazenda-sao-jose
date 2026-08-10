import { db } from "./db";
import "./db-estoque";

db.exec(`
  CREATE TABLE IF NOT EXISTS metas (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo        TEXT NOT NULL,
    tipo          TEXT NOT NULL CHECK (tipo IN ('lucro','receita','producao')),
    setor_id      INTEGER REFERENCES setores(id) ON DELETE CASCADE,
    produto_id    INTEGER REFERENCES estoque_producao(id) ON DELETE CASCADE,
    valor_meta    REAL NOT NULL CHECK (valor_meta > 0),
    data_inicio   TEXT NOT NULL,
    data_fim      TEXT NOT NULL,
    observacao    TEXT,
    status        TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','arquivada')),
    criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_metas_status ON metas(status);
  CREATE INDEX IF NOT EXISTS idx_metas_periodo ON metas(data_inicio, data_fim);
`);

console.log("Tabela de metas pronta.");
