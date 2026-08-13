import webpush from "web-push";
import { db } from "./db";
import "./db-notificacoes";
import "./db-manejo";
import "./db-documentos";
import "./db-financiamentos";
import "./db-animais";

export interface PayloadNotificacao {
  titulo: string;
  corpo: string;
  url?: string;
}

function obterConfig(chave: string): string | null {
  const row = db.prepare("SELECT valor FROM configuracoes_app WHERE chave = ?").get(chave) as
    | { valor: string }
    | undefined;
  return row?.valor ?? null;
}

function salvarConfig(chave: string, valor: string) {
  db.prepare("INSERT INTO configuracoes_app (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor").run(
    chave,
    valor
  );
}

export function obterChavesVapid(): { publicKey: string; privateKey: string } {
  let publicKey = obterConfig("vapid_public_key");
  let privateKey = obterConfig("vapid_private_key");

  if (!publicKey || !privateKey) {
    const par = webpush.generateVAPIDKeys();
    publicKey = par.publicKey;
    privateKey = par.privateKey;
    salvarConfig("vapid_public_key", publicKey);
    salvarConfig("vapid_private_key", privateKey);
  }

  return { publicKey, privateKey };
}

let vapidConfigurado = false;
function garantirWebPushConfigurado() {
  if (vapidConfigurado) return;
  const { publicKey, privateKey } = obterChavesVapid();
  webpush.setVapidDetails("mailto:contato@fazendasaojose.local", publicKey, privateKey);
  vapidConfigurado = true;
}

interface Subscription {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function enviarParaSubscription(sub: Subscription, payload: PayloadNotificacao) {
  garantirWebPushConfigurado();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(sub.id);
    }
  }
}

export async function enviarParaFuncionario(funcionarioId: number, payload: PayloadNotificacao) {
  const subs = db
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE funcionario_id = ?")
    .all(funcionarioId) as Subscription[];
  await Promise.all(subs.map((sub) => enviarParaSubscription(sub, payload)));
}

export async function enviarParaAdmins(payload: PayloadNotificacao) {
  const admins = db.prepare("SELECT id FROM funcionarios WHERE tipo = 'chefe' AND ativo = 1").all() as { id: number }[];
  await Promise.all(admins.map((a) => enviarParaFuncionario(a.id, payload)));
}

/**
 * Roda a cada checagem do agendador. So dispara o resumo diario uma vez por dia,
 * e nunca antes das 6h, pra nao acordar ninguem de madrugada se o servidor reiniciar de noite.
 */
export async function verificarEEnviarAvisosDiarios() {
  const agora = new Date();
  if (agora.getHours() < 6) return;

  const hoje = agora.toISOString().slice(0, 10);
  if (obterConfig("ultimo_envio_diario") === hoje) return;

  await enviarAvisosDeManejoDoDia(hoje);
  await enviarAvisoDeDocumentosVencendo();
  await enviarAvisoDeParcelasVencendo();
  await enviarAvisoDeVacinasVencendo();

  salvarConfig("ultimo_envio_diario", hoje);
}

async function enviarAvisosDeManejoDoDia(hoje: string) {
  const funcionarios = db
    .prepare(
      `SELECT DISTINCT f.id, f.nome
       FROM manejos m
       JOIN funcionarios f ON f.id = m.funcionario_id
       WHERE m.data_planejada = ? AND m.status = 'planejado' AND f.ativo = 1`
    )
    .all(hoje) as { id: number; nome: string }[];

  for (const funcionario of funcionarios) {
    const atividades = db
      .prepare("SELECT atividade_nome FROM manejos WHERE funcionario_id = ? AND data_planejada = ? AND status = 'planejado'")
      .all(funcionario.id, hoje) as { atividade_nome: string }[];
    if (atividades.length === 0) continue;

    const corpo =
      atividades.length === 1
        ? atividades[0].atividade_nome
        : `${atividades[0].atividade_nome} e mais ${atividades.length - 1}`;

    await enviarParaFuncionario(funcionario.id, {
      titulo: `Você tem ${atividades.length} atividade${atividades.length > 1 ? "s" : ""} hoje`,
      corpo,
      url: "/manejo",
    });
  }
}

async function enviarAvisoDeDocumentosVencendo() {
  const hoje = new Date().toISOString().slice(0, 10);
  const documentos = db
    .prepare(
      `SELECT titulo FROM documentos
       WHERE status = 'ativo' AND data_vencimento IS NOT NULL
         AND data_vencimento <= date(?, '+7 days')
       ORDER BY data_vencimento ASC`
    )
    .all(hoje) as { titulo: string }[];

  if (documentos.length === 0) return;

  const corpo =
    documentos.length === 1
      ? documentos[0].titulo
      : `${documentos[0].titulo} e mais ${documentos.length - 1}`;

  await enviarParaAdmins({
    titulo: `${documentos.length} documento${documentos.length > 1 ? "s" : ""} vencendo ou vencido${documentos.length > 1 ? "s" : ""}`,
    corpo,
    url: "/documentos",
  });
}

async function enviarAvisoDeParcelasVencendo() {
  const hoje = new Date().toISOString().slice(0, 10);
  const parcelas = db
    .prepare(
      `SELECT descricao FROM financiamentos_rurais
       WHERE status = 'ativo' AND proxima_parcela <= date(?, '+7 days')
       ORDER BY proxima_parcela ASC`
    )
    .all(hoje) as { descricao: string }[];

  if (parcelas.length === 0) return;

  const corpo =
    parcelas.length === 1
      ? parcelas[0].descricao
      : `${parcelas[0].descricao} e mais ${parcelas.length - 1}`;

  await enviarParaAdmins({
    titulo: `${parcelas.length} parcela${parcelas.length > 1 ? "s" : ""} de financiamento vencendo ou vencida${parcelas.length > 1 ? "s" : ""}`,
    corpo,
    url: "/financiamentos",
  });
}

async function enviarAvisoDeVacinasVencendo() {
  const hoje = new Date().toISOString().slice(0, 10);
  const vacinas = db
    .prepare(
      `SELECT v.produto, a.identificacao
       FROM animais_vacinas v
       JOIN animais a ON a.id = v.animal_id
       WHERE a.status = 'ativo' AND v.proxima_dose IS NOT NULL
         AND v.proxima_dose <= date(?, '+7 days')
       ORDER BY v.proxima_dose ASC`
    )
    .all(hoje) as { produto: string; identificacao: string }[];

  if (vacinas.length === 0) return;

  const corpo =
    vacinas.length === 1
      ? `${vacinas[0].produto} (${vacinas[0].identificacao})`
      : `${vacinas[0].produto} (${vacinas[0].identificacao}) e mais ${vacinas.length - 1}`;

  await enviarParaAdmins({
    titulo: `${vacinas.length} dose${vacinas.length > 1 ? "s" : ""} de vacina vencendo ou vencida${vacinas.length > 1 ? "s" : ""}`,
    corpo,
    url: "/animais",
  });
}
