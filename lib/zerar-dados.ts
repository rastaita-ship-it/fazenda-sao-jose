import { db } from "./db";
import "./db-ponto";
import "./db-manejo";
import "./db-manejo-grupo";
import "./db-patrimonio";
import "./db-patrimonio-arquivos";
import "./db-estoque";
import "./db-auth";
import "./db-salario";
import "./db-area";
import "./db-custos";

const tabelas = [
  "transacoes",
  "registros_ponto",
  "funcionarios",
  "manejos",
  "atividades_padrao",
  "patrimonio",
  "movimentacoes_insumo",
  "estoque_insumos",
  "movimentacoes_producao",
  "estoque_producao",
  "lancamentos_operacionais",
];

for (const tabela of tabelas) {
  db.prepare(`DELETE FROM ${tabela}`).run();
}

db.prepare("UPDATE setores SET area_hectares = NULL").run();

console.log("Dados de teste apagados. Setores mantidos.");
