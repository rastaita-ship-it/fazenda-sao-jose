import { db } from "./db";
import "./db-manejo";

const colunas = db.prepare("PRAGMA table_info(manejos)").all() as { name: string }[];
const nomes = colunas.map((c) => c.name);

if (!nomes.includes("grupo_id")) {
  db.exec("ALTER TABLE manejos ADD COLUMN grupo_id TEXT");
}

const semGrupo = db.prepare("SELECT id FROM manejos WHERE grupo_id IS NULL").all() as { id: number }[];
if (semGrupo.length > 0) {
  const atualizar = db.prepare("UPDATE manejos SET grupo_id = ? WHERE id = ?");
  const migrar = db.transaction(() => {
    for (const row of semGrupo) {
      atualizar.run(`legado-${row.id}`, row.id);
    }
  });
  migrar();
}

console.log("Coluna grupo_id pronta em manejos.");
