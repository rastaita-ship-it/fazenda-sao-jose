import { db } from "./db";
import "./db-ponto";

/**
 * Adiciona colunas de geolocalização em registros_ponto, se ainda não existirem.
 * SQLite não tem "ADD COLUMN IF NOT EXISTS", então checamos manualmente.
 */
const colunas = db.prepare("PRAGMA table_info(registros_ponto)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("latitude")) {
  db.exec("ALTER TABLE registros_ponto ADD COLUMN latitude REAL");
}
if (!nomes.includes("longitude")) {
  db.exec("ALTER TABLE registros_ponto ADD COLUMN longitude REAL");
}
if (!nomes.includes("dentro_area")) {
  db.exec("ALTER TABLE registros_ponto ADD COLUMN dentro_area INTEGER");
}

console.log("Colunas de geolocalização prontas em registros_ponto.");
