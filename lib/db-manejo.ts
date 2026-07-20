import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS atividades_padrao (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    setor_tipo    TEXT NOT NULL CHECK (setor_tipo IN ('cafe','gado','ovelhas','outra_cultura')),
    nome          TEXT NOT NULL,
    mes_sugerido  INTEGER,
    descricao     TEXT
  );

  CREATE TABLE IF NOT EXISTS manejos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    setor_id        INTEGER NOT NULL REFERENCES setores(id) ON DELETE CASCADE,
    atividade_nome  TEXT NOT NULL,
    data_planejada  TEXT NOT NULL,
    data_realizada  TEXT,
    funcionario_id  INTEGER REFERENCES funcionarios(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado','concluido','alterado','cancelado')),
    observacao      TEXT,
    origem          TEXT NOT NULL DEFAULT 'avulso' CHECK (origem IN ('padrao','avulso')),
    criado_em       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_manejos_setor ON manejos(setor_id);
  CREATE INDEX IF NOT EXISTS idx_manejos_data ON manejos(data_planejada);
`);

const count = db.prepare("SELECT COUNT(*) AS c FROM atividades_padrao").get() as { c: number };
if (count.c === 0) {
  const insert = db.prepare("INSERT INTO atividades_padrao (setor_tipo, nome, mes_sugerido) VALUES (?, ?, ?)");
  const seed = db.transaction(() => {
    insert.run("cafe", "Analise de solo", 5);
    insert.run("cafe", "Analise foliar", 11);
    insert.run("cafe", "Calagem e Gessagem", 6);
    insert.run("cafe", "Adubacao", 10);
    insert.run("cafe", "Poda", 7);
    insert.run("cafe", "Manejo do mato", 12);
    insert.run("cafe", "Controle de pragas e doencas", 1);
    insert.run("cafe", "Colheita", 6);
    insert.run("cafe", "Secagem e beneficiamento", 7);

    insert.run("gado", "Vacinacao febre aftosa", 5);
    insert.run("gado", "Vacinacao clostridioses", 3);
    insert.run("gado", "Vacinacao IBR BVD Leptospirose", 9);
    insert.run("gado", "Vermifugacao", 4);
    insert.run("gado", "Manejo reprodutivo", 11);
    insert.run("gado", "Pesagem", 1);
    insert.run("gado", "Manejo de pasto", null);
    insert.run("gado", "Suplementacao mineral", null);
    insert.run("gado", "Descorna e castracao", 8);

    insert.run("ovelhas", "Vacinacao enterotoxemia", 3);
    insert.run("ovelhas", "Vermifugacao", 4);
    insert.run("ovelhas", "Tosquia", 9);
    insert.run("ovelhas", "Manejo reprodutivo", 11);
    insert.run("ovelhas", "Casqueamento", 6);
    insert.run("ovelhas", "Pesagem", 1);
    insert.run("ovelhas", "Suplementacao", null);

    insert.run("outra_cultura", "Plantio", null);
    insert.run("outra_cultura", "Adubacao", null);
    insert.run("outra_cultura", "Controle de pragas e doencas", null);
    insert.run("outra_cultura", "Manejo do mato", null);
    insert.run("outra_cultura", "Colheita", null);
  });
  seed();
}

console.log("Tabelas de manejo prontas.");
