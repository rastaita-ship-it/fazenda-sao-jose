import { db } from "./db";
import "./db-ponto";

const colunas = db.prepare("PRAGMA table_info(registros_ponto)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("foto_url")) {
  db.exec("ALTER TABLE registros_ponto ADD COLUMN foto_url TEXT");
}

console.log("Coluna de selfie pronta em registros_ponto.");
