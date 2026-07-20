import { db } from "./db";

const colunas = db.prepare("PRAGMA table_info(setores)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("area_hectares")) {
  db.exec("ALTER TABLE setores ADD COLUMN area_hectares REAL");
}

console.log("Coluna area_hectares pronta em setores.");
