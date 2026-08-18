import { verificarEEnviarAvisosDiarios } from "./notificacoes";

declare global {
   
  var __fazendaAgendadorIniciado: boolean | undefined;
}

const UMA_HORA_MS = 60 * 60 * 1000;

// "next build" tambem carrega app/layout.tsx (pra pre-renderizar paginas estaticas).
// Sem essa checagem, cada build local dispararia o verificador e poderia enviar
// notificacoes de verdade contra o banco de dados local.
const emBuild = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Verificador interno de avisos diarios (manejo do dia, documentos vencendo).
 * Roda dentro do proprio processo do servidor Next.js, sem depender de cron externo.
 * O guard por variavel global evita duplicar o intervalo no hot-reload do Next em dev.
 */
if (!emBuild && !global.__fazendaAgendadorIniciado) {
  global.__fazendaAgendadorIniciado = true;

  verificarEEnviarAvisosDiarios().catch((erro) => {
    console.error("Erro ao verificar avisos diarios:", erro);
  });

  setInterval(() => {
    verificarEEnviarAvisosDiarios().catch((erro) => {
      console.error("Erro ao verificar avisos diarios:", erro);
    });
  }, UMA_HORA_MS);
}
