import { db } from "./db";
import "./db-estoque";

const colunas = db.prepare("PRAGMA table_info(movimentacoes_insumo)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("fornecedor")) {
  db.exec("ALTER TABLE movimentacoes_insumo ADD COLUMN fornecedor TEXT");
}
if (!nomes.includes("preco_unitario")) {
  db.exec("ALTER TABLE movimentacoes_insumo ADD COLUMN preco_unitario REAL");
}

console.log("Colunas de fornecedor e preco unitario prontas em movimentacoes_insumo.");
