import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS registros_campo (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    autor_id    INTEGER,
    autor_nome  TEXT NOT NULL,
    categoria   TEXT NOT NULL CHECK (categoria IN ('praga_doenca','fauna_flora','seguranca','manutencao','curiosidade','outro')),
    descricao   TEXT,
    foto_url    TEXT NOT NULL,
    setor_id    INTEGER REFERENCES setores(id) ON DELETE SET NULL,
    criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
console.log("Tabela de registros de campo pronta.");
