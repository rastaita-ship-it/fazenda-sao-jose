import { db } from "./db";
import "./db-ponto";

/**
 * Chave de idempotencia gerada pelo cliente ao enfileirar um ponto offline.
 * Evita duplicar o registro se o mesmo item da fila for reenviado (ex:
 * resposta perdida por queda de sinal apos o servidor ja ter gravado).
 */
const colunas = db.prepare("PRAGMA table_info(registros_ponto)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("chave_cliente")) {
  db.exec("ALTER TABLE registros_ponto ADD COLUMN chave_cliente TEXT");
}

db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_ponto_chave_cliente ON registros_ponto(chave_cliente) WHERE chave_cliente IS NOT NULL"
);

console.log("Coluna de idempotencia (chave_cliente) pronta em registros_ponto.");
