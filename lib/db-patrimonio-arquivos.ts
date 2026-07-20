import { db } from "./db";
import "./db-patrimonio";

const colunas = db.prepare("PRAGMA table_info(patrimonio)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("foto_url")) {
  db.exec("ALTER TABLE patrimonio ADD COLUMN foto_url TEXT");
}
if (!nomes.includes("manual_url")) {
  db.exec("ALTER TABLE patrimonio ADD COLUMN manual_url TEXT");
}

console.log("Colunas de foto e manual prontas em patrimonio.");
