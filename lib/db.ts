import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

/**
 * lib/db.ts
 * -----------------------------------------------------------------------
 * Single SQLite connection for "Fazenda São José".
 * Uses a singleton pattern so Next.js hot-reload in dev doesn't spawn
 * multiple open handles to the same file.
 *
 * The database file lives in /data/fazenda.db (gitignored). On first run,
 * the schema below is created automatically — no manual migration step.
 * -----------------------------------------------------------------------
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "fazenda.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

declare global {
  // eslint-disable-next-line no-var
  var __fazendaDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL"); // better concurrent read/write behavior
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

export const db = global.__fazendaDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  global.__fazendaDb = db;
}

/**
 * Schema
 * -----------------------------------------------------------------------
 * setores          -> the farm's operational sectors (Café, Gado, Ovelhas,
 *                      Outras Culturas + any custom crop the user adds)
 * transacoes       -> the single ledger for ALL revenue/expense entries.
 *                      Every entry MUST be tagged to a setor.
 * lancamentos_op   -> optional operational data linked to a transação
 *                      (e.g. harvest volume in sacas, herd weight, etc.)
 *                      Kept generic (JSON-ish key/value) so each sector's
 *                      specific metrics don't require new tables later.
 */
function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS setores (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome          TEXT NOT NULL UNIQUE,
      tipo          TEXT NOT NULL CHECK (tipo IN ('cafe','gado','ovelhas','outra_cultura')),
      cor           TEXT DEFAULT '#3f8f34',
      ativo         INTEGER NOT NULL DEFAULT 1,
      criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transacoes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      setor_id      INTEGER NOT NULL REFERENCES setores(id) ON DELETE RESTRICT,
      tipo          TEXT NOT NULL CHECK (tipo IN ('receita','despesa')),
      categoria     TEXT,              -- e.g. "Adubo", "Veterinário", "Venda de sacas"
      descricao     TEXT NOT NULL,
      valor         REAL NOT NULL CHECK (valor >= 0),
      data          TEXT NOT NULL,     -- ISO date (YYYY-MM-DD) of the transaction
      status        TEXT NOT NULL DEFAULT 'pago' CHECK (status IN ('pago','pendente','previsto')),
      criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lancamentos_operacionais (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      setor_id      INTEGER NOT NULL REFERENCES setores(id) ON DELETE CASCADE,
      transacao_id  INTEGER REFERENCES transacoes(id) ON DELETE SET NULL,
      metrica       TEXT NOT NULL,     -- e.g. "sacas_colhidas", "peso_medio_kg", "cabecas"
      valor_num     REAL,
      unidade       TEXT,              -- e.g. "sc", "kg", "cabeças", "L"
      data          TEXT NOT NULL,
      observacao    TEXT,
      criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transacoes_setor ON transacoes(setor_id);
    CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
    CREATE INDEX IF NOT EXISTS idx_transacoes_status ON transacoes(status);
    CREATE INDEX IF NOT EXISTS idx_lanc_op_setor ON lancamentos_operacionais(setor_id);
  `);

  // Seed the four core sectors if the table is empty
  const count = db.prepare("SELECT COUNT(*) AS c FROM setores").get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare(
      "INSERT INTO setores (nome, tipo, cor) VALUES (?, ?, ?)"
    );
    const seed = db.transaction(() => {
      insert.run("Café", "cafe", "#6f4a25");
      insert.run("Gado", "gado", "#3f8f34");
      insert.run("Ovelhas", "ovelhas", "#8cc97f");
    });
    seed();
  }
}
