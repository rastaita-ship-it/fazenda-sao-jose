import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS estoque_insumos (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    nome                TEXT NOT NULL,
    categoria           TEXT NOT NULL CHECK (categoria IN ('fertilizante','semente','defensivo','racao','medicamento','combustivel','outro')),
    unidade             TEXT NOT NULL,
    quantidade_atual    REAL NOT NULL DEFAULT 0,
    quantidade_minima   REAL,
    custo_unitario      REAL,
    setor_id            INTEGER REFERENCES setores(id) ON DELETE SET NULL,
    observacao          TEXT,
    criado_em           TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS movimentacoes_insumo (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    insumo_id       INTEGER NOT NULL REFERENCES estoque_insumos(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
    quantidade      REAL NOT NULL,
    data            TEXT NOT NULL,
    descricao       TEXT,
    custo_total     REAL,
    criado_em       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS estoque_producao (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    produto             TEXT NOT NULL,
    setor_id            INTEGER REFERENCES setores(id) ON DELETE SET NULL,
    unidade             TEXT NOT NULL,
    quantidade_atual    REAL NOT NULL DEFAULT 0,
    local_armazenamento TEXT,
    observacao          TEXT,
    criado_em           TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS movimentacoes_producao (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id      INTEGER NOT NULL REFERENCES estoque_producao(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
    quantidade      REAL NOT NULL,
    data            TEXT NOT NULL,
    descricao       TEXT,
    transacao_id    INTEGER REFERENCES transacoes(id) ON DELETE SET NULL,
    criado_em       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_mov_insumo_insumo ON movimentacoes_insumo(insumo_id);
  CREATE INDEX IF NOT EXISTS idx_mov_producao_produto ON movimentacoes_producao(produto_id);
`);

console.log("Tabelas de estoque prontas.");
