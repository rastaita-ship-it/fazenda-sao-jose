import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS avisos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    autor_id    INTEGER,
    autor_nome  TEXT NOT NULL,
    texto       TEXT NOT NULL,
    criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contatos_emergencia (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL,
    categoria   TEXT NOT NULL CHECK (categoria IN ('veterinario','mecanico','bombeiro','policia','ambulancia','outro')),
    telefone    TEXT NOT NULL,
    observacao  TEXT
  );
`);
console.log("Tabelas de mural e emergencia prontas.");
