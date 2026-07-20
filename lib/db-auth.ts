import { db } from "./db";

const colunas = db.prepare("PRAGMA table_info(funcionarios)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("tipo")) {
  db.exec("ALTER TABLE funcionarios ADD COLUMN tipo TEXT NOT NULL DEFAULT 'campo'");
}
if (!nomes.includes("pin")) {
  db.exec("ALTER TABLE funcionarios ADD COLUMN pin TEXT");
}

console.log("Colunas de autenticacao prontas em funcionarios.");
