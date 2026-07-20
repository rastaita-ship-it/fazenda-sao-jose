import { db } from "./db";
import "./db-manejo";

db.exec(`
  CREATE TABLE IF NOT EXISTS patrimonio (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    nome                TEXT NOT NULL,
    tipo                TEXT NOT NULL CHECK (tipo IN ('trator','maquina','ferramenta','veiculo','instalacao','area_cultivo','pasto','outro')),
    identificador       TEXT,
    data_aquisicao      TEXT,
    valor_aquisicao     REAL,
    vida_util_meses     INTEGER,
    horimetro_km_atual  REAL,
    status              TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','manutencao','inativo','vendido')),
    observacao          TEXT,
    criado_em           TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_patrimonio_tipo ON patrimonio(tipo);
`);

const colunasManejos = db.prepare("PRAGMA table_info(manejos)").all() as { name: string }[];
const nomesManejos = colunasManejos.map((c) => c.name);
if (!nomesManejos.includes("patrimonio_id")) {
  db.exec("ALTER TABLE manejos ADD COLUMN patrimonio_id INTEGER REFERENCES patrimonio(id) ON DELETE SET NULL");
}

db.prepare("INSERT OR IGNORE INTO setores (nome, tipo, cor) VALUES (?, ?, ?)").run(
  "Oficina e Manutencao",
  "outra_cultura",
  "#6b7280"
);

const countAtividades = db
  .prepare("SELECT COUNT(*) AS c FROM atividades_padrao WHERE setor_tipo = 'outra_cultura' AND nome LIKE '%leo%'")
  .get() as { c: number };
if (countAtividades.c === 0) {
  const inserir = db.prepare("INSERT INTO atividades_padrao (setor_tipo, nome, mes_sugerido) VALUES (?, ?, ?)");
  inserir.run("outra_cultura", "Troca de oleo", null);
  inserir.run("outra_cultura", "Revisao geral", null);
  inserir.run("outra_cultura", "Lubrificacao", null);
  inserir.run("outra_cultura", "Troca de peca", null);
  inserir.run("outra_cultura", "Inspecao", null);
  inserir.run("outra_cultura", "Afiacao de lamina", null);
  inserir.run("outra_cultura", "Calibragem de pneus", null);
}

console.log("Tabela de patrimonio e setor de Oficina prontos.");
