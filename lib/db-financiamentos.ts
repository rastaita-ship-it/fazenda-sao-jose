import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS financiamentos_rurais (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    instituicao         TEXT NOT NULL,
    descricao           TEXT NOT NULL,
    valor_parcela       REAL,
    proxima_parcela     TEXT NOT NULL,
    periodicidade       TEXT NOT NULL DEFAULT 'mensal' CHECK (periodicidade IN ('mensal','anual')),
    tem_proagro         INTEGER NOT NULL DEFAULT 0,
    observacao          TEXT,
    status              TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','quitado')),
    criado_em           TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_financiamentos_proxima ON financiamentos_rurais(proxima_parcela);
`);

console.log("Tabela de financiamentos rurais pronta.");
