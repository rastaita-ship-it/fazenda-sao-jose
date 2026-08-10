import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS configuracoes_app (
    chave   TEXT PRIMARY KEY,
    valor   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    funcionario_id  INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    endpoint        TEXT NOT NULL UNIQUE,
    p256dh          TEXT NOT NULL,
    auth            TEXT NOT NULL,
    criado_em       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_push_subscriptions_funcionario ON push_subscriptions(funcionario_id);
`);

console.log("Tabelas de notificacoes push prontas.");
