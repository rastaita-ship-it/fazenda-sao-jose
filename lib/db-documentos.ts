import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS documentos (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo              TEXT NOT NULL CHECK (tipo IN ('licenca','seguro','cnh','outro')),
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

  CREATE INDEX IF NOT EXISTS idx_documentos_vencimento ON documentos(data_vencimento);
  CREATE INDEX IF NOT EXISTS idx_documentos_patrimonio ON documentos(patrimonio_id);
  CREATE INDEX IF NOT EXISTS idx_documentos_funcionario ON documentos(funcionario_id);
`);

console.log("Tabela de documentos e vencimentos pronta.");
