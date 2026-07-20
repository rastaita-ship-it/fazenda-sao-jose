import { db } from "./db";

const colunas = db.prepare("PRAGMA table_info(transacoes)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("classificacao_custo")) {
  db.exec("ALTER TABLE transacoes ADD COLUMN classificacao_custo TEXT");
}

console.log("Coluna classificacao_custo pronta em transacoes.");
