// @vitest-environment node
import { describe, it, expect } from "vitest";
import { db } from "./db";
import "./db-documentos"; // schema antigo, sem os tipos novos
import "./db-patrimonio";
import "./db-ponto";

describe("migracao de tipos de documento (lib/db-documentos-tipos.ts)", () => {
  it("preserva documentos ja existentes e libera os tipos novos", async () => {
    const antigo = db
      .prepare("INSERT INTO documentos (tipo, titulo) VALUES ('licenca', 'Doc Antigo Teste')")
      .run();

    // Importar dispara a migracao (reconstroi a tabela com o CHECK ampliado).
    await import("./db-documentos-tipos");

    const preservado = db
      .prepare("SELECT tipo, titulo FROM documentos WHERE id = ?")
      .get(antigo.lastInsertRowid) as { tipo: string; titulo: string };
    expect(preservado.titulo).toBe("Doc Antigo Teste");
    expect(preservado.tipo).toBe("licenca");

    expect(() =>
      db.prepare("INSERT INTO documentos (tipo, titulo) VALUES ('nota_fiscal', 'Nota Teste')").run()
    ).not.toThrow();

    expect(() =>
      db.prepare("INSERT INTO documentos (tipo, titulo) VALUES ('invalido_xyz', 'Deve falhar')").run()
    ).toThrow();
  });
});
