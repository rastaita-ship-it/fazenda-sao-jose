import { db } from "./db";
import "./db-manejo";

const dicas: Record<string, string> = {
  "Analise de solo": "Coletar amostras a cada 5 hectares, na profundidade de 0-20cm, fora da epoca de adubacao. Essencial para calcular corretamente calagem e adubacao.",
  "Analise foliar": "Coletar a terceira ou quarta folha a partir da ponta do ramo, no periodo de granacao dos frutos, para ajustar a adubacao do proximo ciclo.",
  "Calagem e Gessagem": "Aplicar 60 a 90 dias antes do plantio ou adubacao, incorporando ao solo. Corrige acidez e melhora absorcao de nutrientes.",
  "Adubacao": "Parcelar em varias aplicacoes ao longo do ano, respeitando o estagio fenologico da planta. Evitar aplicacao em solo seco.",
  "Poda": "Melhor epoca e apos a colheita, no periodo seco, antes da nova brotacao. Remove ramos improdutivos e melhora a arejamento da planta.",
  "Manejo do mato": "Controlar nas faixas de plantio, preferencialmente por rocada, evitando erosao do solo. Evitar em periodos de seca extrema.",
  "Controle de pragas e doencas": "Monitorar semanalmente, especialmente brocado-cafe e ferrugem. Agir preventivamente, nao apenas quando ja houver dano visivel.",
  "Colheita": "Colher quando a maior parte dos frutos estiver cereja, evitando mistura excessiva com verdes. Colheita seletiva melhora a qualidade final.",
  "Secagem e beneficiamento": "Secar em terreiro ou secador ate 11-12% de umidade, revolvendo o cafe regularmente para secagem uniforme.",

  "Vacinacao febre aftosa": "Vacinar todo o rebanho, evitando aplicar com animal solto no bretel. Fechar a porteira, conter com pescoceira, aplicar e massagear o local depois.",
  "Vacinacao clostridioses": "Recomendada entre agosto e setembro. Protege contra doencas que matam rapidamente e nao respondem bem a antibioticos.",
  "Vacinacao IBR BVD Leptospirose": "Seguir calendario do veterinario responsavel. Nao misturar vacinas diferentes na mesma seringa, salvo indicacao do fabricante.",
  "Vermifugacao": "Alternar principios ativos entre aplicacoes para evitar resistencia parasitaria. Fazer preferencialmente no inicio do periodo seco.",
  "Manejo reprodutivo": "Observar cio, condicao corporal e periodo de monta. Manter registro individual de cada matriz para acompanhar performance.",
  "Pesagem": "Pesar em jejum quando possivel, sempre no mesmo horario, para comparacoes confiaveis entre pesagens.",
  "Manejo de pasto": "Respeitar periodo de descanso da forragem antes de reintroduzir o rebanho. Evitar superlotacao para nao degradar a pastagem.",
  "Suplementacao mineral": "Disponibilizar sal mineral em cocho coberto, proximo a agua, repondo antes que acabe totalmente.",
  "Descorna e castracao": "Realizar em animais jovens, com anestesia local quando possivel, e em periodo de baixa incidencia de moscas.",

  "Vacinacao enterotoxemia": "Vacinar antes do periodo de maior risco (mudanca brusca de dieta). Reforco geralmente necessario 3-4 semanas apos a primeira dose.",
  "Tosquia": "Melhor epoca e final do outono ou inicio da primavera, evitando frio intenso logo apos a tosquia. Reduz risco de bicheira e parasitas.",
  "Casqueamento": "Realizar a cada 2-3 meses ou conforme crescimento, prevenindo problemas de locomocao e infeccoes no casco.",

  "Troca de oleo": "Seguir o intervalo do manual do fabricante (geralmente por horas de uso). Descartar o oleo usado em local apropriado.",
  "Revisao geral": "Checar filtros, correias, fluidos e desgaste de pecas moveis antes do periodo de maior uso do equipamento.",
  "Lubrificacao": "Aplicar graxa nos pontos indicados pelo manual antes de cada uso intenso, evitando ressecamento de rolamentos.",
  "Calibragem de pneus": "Conferir pressao semanalmente, especialmente antes de operacoes que exigem tracao (aracao, transporte pesado).",
};

const atualizar = db.prepare("UPDATE atividades_padrao SET descricao = ? WHERE nome = ? AND (descricao IS NULL OR descricao = '')");
let total = 0;
for (const [nome, texto] of Object.entries(dicas)) {
  const r = atualizar.run(texto, nome);
  total += r.changes;
}
console.log(`Dicas tecnicas atualizadas em ${total} atividades.`);
