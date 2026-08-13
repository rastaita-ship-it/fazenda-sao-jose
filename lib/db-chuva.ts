import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS registros_chuva (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    data        TEXT NOT NULL UNIQUE,
    mm          REAL NOT NULL CHECK (mm >= 0),
    observacao  TEXT,
    criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_chuva_data ON registros_chuva(data);
`);

console.log("Tabela de registros de chuva pronta.");
