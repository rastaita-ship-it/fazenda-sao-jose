import { db } from "./db";
import "./db-patrimonio";

db.exec(`
  CREATE TABLE IF NOT EXISTS abastecimentos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    patrimonio_id   INTEGER NOT NULL REFERENCES patrimonio(id) ON DELETE CASCADE,
    data            TEXT NOT NULL,
    litros          REAL NOT NULL,
    valor_total     REAL,
    preco_litro     REAL,
    horimetro_km    REAL,
    local           TEXT,
    observacao      TEXT,
    transacao_id    INTEGER REFERENCES transacoes(id) ON DELETE SET NULL,
    criado_em       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_abastecimentos_patrimonio ON abastecimentos(patrimonio_id);
  CREATE INDEX IF NOT EXISTS idx_abastecimentos_data ON abastecimentos(data);
`);

console.log("Tabela de abastecimentos pronta.");
