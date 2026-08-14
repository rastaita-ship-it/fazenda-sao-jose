import { db } from "./db";
import "./db-documentos";
// documentos referencia patrimonio(id) e funcionarios(id) — garante que
// as duas tabelas existam antes de reconstruir, senao o CREATE TABLE
// falha com "no such table" quando foreign_keys=ON.
import "./db-patrimonio";
import "./db-ponto";

/**
 * Amplia o CHECK constraint de `documentos.tipo`. SQLite nao deixa
 * alterar um CHECK existente com ALTER TABLE, entao reconstroi a tabela
 * (padrao recomendado pelo proprio SQLite): cria a nova, copia os dados,
 * derruba a antiga, renomeia. Guardado pelo texto do CHECK atual em
 * sqlite_master, entao so roda uma vez e nunca perde documento existente.
 */
const schema = db
  .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'documentos'")
  .get() as { sql: string } | undefined;

if (schema && schema.sql.includes("'licenca','seguro','cnh','outro'")) {
  const reconstruir = db.transaction(() => {
    db.exec(`
      CREATE TABLE documentos_novo (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo              TEXT NOT NULL CHECK (tipo IN ('licenca','seguro','cnh','nota_fiscal','contrato','car','receituario','certidao','outro')),
        titulo            TEXT NOT NULL,
        patrimonio_id     INTEGER REFERENCES patrimonio(id) ON DELETE CASCADE,
        funcionario_id    INTEGER REFERENCES funcionarios(id) ON DELETE CASCADE,
        numero_documento  TEXT,
        data_emissao      TEXT,
        data_vencimento   TEXT,
        arquivo_url       TEXT,
        observacao        TEXT,
        status            TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','arquivado')),
        criado_em         TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO documentos_novo SELECT * FROM documentos;
      DROP TABLE documentos;
      ALTER TABLE documentos_novo RENAME TO documentos;

      CREATE INDEX IF NOT EXISTS idx_documentos_vencimento ON documentos(data_vencimento);
      CREATE INDEX IF NOT EXISTS idx_documentos_patrimonio ON documentos(patrimonio_id);
      CREATE INDEX IF NOT EXISTS idx_documentos_funcionario ON documentos(funcionario_id);
    `);
  });
  reconstruir();
  console.log("Tipos de documento ampliados (nota fiscal, contrato, CAR, receituario, certidao).");
}
