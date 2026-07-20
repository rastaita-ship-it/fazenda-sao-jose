import { db } from "./db";

/**
 * lib/db-ponto.ts
 * -----------------------------------------------------------------------
 * Extensão do banco de dados para o módulo de Ponto Eletrônico.
 * Mantido em arquivo separado pra não misturar com o schema financeiro,
 * mas usa a mesma conexão (db) de lib/db.ts.
 * -----------------------------------------------------------------------
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS funcionarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT NOT NULL,
    funcao        TEXT,              -- ex: "Vaqueiro", "Cafeicultor", "Diarista"
    ativo         INTEGER NOT NULL DEFAULT 1,
    criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS registros_ponto (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    funcionario_id  INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
    data_hora       TEXT NOT NULL DEFAULT (datetime('now')),
    observacao      TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_ponto_funcionario ON registros_ponto(funcionario_id);
  CREATE INDEX IF NOT EXISTS idx_ponto_data ON registros_ponto(data_hora);
`);

console.log("Tabelas de ponto eletrônico prontas.");
