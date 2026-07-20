import { db } from "./db";

const colunas = db.prepare("PRAGMA table_info(funcionarios)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("salario_mensal")) {
  db.exec("ALTER TABLE funcionarios ADD COLUMN salario_mensal REAL");
}
if (!nomes.includes("tipo_contrato")) {
  db.exec("ALTER TABLE funcionarios ADD COLUMN tipo_contrato TEXT DEFAULT 'fixo'");
}

console.log("Colunas de salario prontas em funcionarios.");
