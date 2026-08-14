import { db } from "./db";
import "./db-estoque";

const colunas = db.prepare("PRAGMA table_info(movimentacoes_insumo)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("transacao_id")) {
  db.exec("ALTER TABLE movimentacoes_insumo ADD COLUMN transacao_id INTEGER REFERENCES transacoes(id) ON DELETE SET NULL");
}
if (!nomes.includes("funcionario_id")) {
  db.exec("ALTER TABLE movimentacoes_insumo ADD COLUMN funcionario_id INTEGER REFERENCES funcionarios(id) ON DELETE SET NULL");
}
if (!nomes.includes("finalidade")) {
  db.exec("ALTER TABLE movimentacoes_insumo ADD COLUMN finalidade TEXT");
}
if (!nomes.includes("talhao_id")) {
  db.exec("ALTER TABLE movimentacoes_insumo ADD COLUMN talhao_id INTEGER REFERENCES talhoes(id) ON DELETE SET NULL");
}

console.log("Colunas de rastreamento (despesa, funcionario, finalidade, talhao) prontas em movimentacoes_insumo.");
