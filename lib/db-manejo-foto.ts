import { db } from "./db";

const colunas = db.prepare("PRAGMA table_info(manejos)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);
if (!nomes.includes("foto_conclusao_url")) {
  db.exec("ALTER TABLE manejos ADD COLUMN foto_conclusao_url TEXT");
}
console.log("Coluna foto_conclusao_url pronta em manejos.");
