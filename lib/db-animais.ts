import { db } from "./db";
import "./db-talhoes";

db.exec(`
  CREATE TABLE IF NOT EXISTS animais (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    setor_id          INTEGER NOT NULL REFERENCES setores(id) ON DELETE CASCADE,
    talhao_id         INTEGER REFERENCES talhoes(id) ON DELETE SET NULL,
    identificacao     TEXT NOT NULL,
    nome              TEXT,
    especie           TEXT NOT NULL CHECK (especie IN ('bovino','ovino','outro')),
    sexo              TEXT NOT NULL CHECK (sexo IN ('macho','femea')),
    data_nascimento   TEXT,
    raca              TEXT,
    status            TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','vendido','morto')),
    foto_url          TEXT,
    observacao        TEXT,
    criado_em         TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS animais_pesagens (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    animal_id     INTEGER NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    peso_kg       REAL NOT NULL,
    data          TEXT NOT NULL,
    observacao    TEXT,
    criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS animais_vacinas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    animal_id       INTEGER NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    produto         TEXT NOT NULL,
    data_aplicacao  TEXT NOT NULL,
    proxima_dose    TEXT,
    observacao      TEXT,
    criado_em       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS animais_reproducao (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    animal_id     INTEGER NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
    tipo          TEXT NOT NULL CHECK (tipo IN ('cobertura','prenhez_confirmada','parto','desmame')),
    data          TEXT NOT NULL,
    parceiro      TEXT,
    observacao    TEXT,
    criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_animais_setor ON animais(setor_id);
  CREATE INDEX IF NOT EXISTS idx_animais_talhao ON animais(talhao_id);
  CREATE INDEX IF NOT EXISTS idx_animais_status ON animais(status);
  CREATE INDEX IF NOT EXISTS idx_pesagens_animal ON animais_pesagens(animal_id);
  CREATE INDEX IF NOT EXISTS idx_vacinas_animal ON animais_vacinas(animal_id);
  CREATE INDEX IF NOT EXISTS idx_reproducao_animal ON animais_reproducao(animal_id);
`);

console.log("Tabelas de animais e historico individual prontas.");
