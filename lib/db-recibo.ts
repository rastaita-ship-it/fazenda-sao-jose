import { db } from "./db";

const colunas = db.prepare("PRAGMA table_info(transacoes)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);
if (!nomes.includes("recibo_url")) {
  db.exec("ALTER TABLE transacoes ADD COLUMN recibo_url TEXT");
}
console.log("Coluna recibo_url pronta em transacoes.");
