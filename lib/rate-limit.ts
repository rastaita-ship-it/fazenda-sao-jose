/**
 * Limitador de tentativas em memoria (o servidor roda como processo Node
 * unico, sem necessidade de um store externo tipo Redis para isso).
 */

interface RegistroTentativas {
  falhas: number;
  bloqueadoAte: number | null;
}

const MAX_TENTATIVAS = 5;
const JANELA_BLOQUEIO_MS = 5 * 60 * 1000;

const tentativas = new Map<string, RegistroTentativas>();

export function estaBloqueado(chave: string): boolean {
  const registro = tentativas.get(chave);
  if (!registro?.bloqueadoAte) return false;
  if (Date.now() >= registro.bloqueadoAte) {
    tentativas.delete(chave);
    return false;
  }
  return true;
}

export function registrarTentativaFalha(
  chave: string,
  maxTentativas = MAX_TENTATIVAS,
  janelaBloqueioMs = JANELA_BLOQUEIO_MS
): void {
  const registro = tentativas.get(chave) ?? { falhas: 0, bloqueadoAte: null };
  registro.falhas += 1;
  if (registro.falhas >= maxTentativas) {
    registro.bloqueadoAte = Date.now() + janelaBloqueioMs;
  }
  tentativas.set(chave, registro);
}

export function limparTentativas(chave: string): void {
  tentativas.delete(chave);
}

/**
 * X-Forwarded-For e um header que o CLIENTE pode enviar livremente — um
 * atacante pode mandar um valor diferente a cada requisicao so pra burlar
 * um limitador por IP. Pega o ultimo IP da lista (o mais proximo do
 * servidor), que e o que o proxy confiavel da hospedagem (Railway) anexa
 * por conta propria, e nao o que o cliente escreveu no header.
 * Mesmo assim, isso nao e a prova de spoofing sozinho — por isso o login
 * tambem usa um limite global (ver app/api/auth/login/route.ts) que nao
 * depende de nenhum valor controlado pelo cliente.
 */
export function obterIpRequisicao(req: Request): string {
  const encaminhado = req.headers.get("x-forwarded-for");
  if (encaminhado) {
    const ips = encaminhado.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (ips.length > 0) return ips[ips.length - 1];
  }
  return req.headers.get("x-real-ip") ?? "desconhecido";
}
