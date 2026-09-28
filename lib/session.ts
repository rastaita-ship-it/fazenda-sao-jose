import crypto from "crypto";

/**
 * O cookie funcionario_id guarda quem esta logado. Antes, o valor era o id
 * puro — como o cookie e httpOnly (JS da pagina nao le), mas nada impede
 * qualquer requisicao HTTP direta (curl, um proxy, etc.) de mandar
 * "Cookie: funcionario_id=1" e entrar como qualquer usuario, inclusive o
 * chefe. Por isso o cookie agora carrega "id.assinatura", com a assinatura
 * calculada aqui a partir de um segredo que so o servidor conhece — sem
 * saber o segredo, nao da pra forjar um valor que passe na verificacao.
 */

const SEGREDO = process.env.SESSION_SECRET;

if (!SEGREDO && process.env.NODE_ENV !== "test") {
  console.warn(
    "[sessao] SESSION_SECRET nao definido no ambiente — usando uma chave temporaria " +
      "gerada em memoria. Isso funciona, mas desloga todo mundo a cada reinicio do " +
      "servidor. Defina SESSION_SECRET no .env.local (veja o cofre de credenciais)."
  );
}

// Fallback so existe pra nao derrubar o servidor se esquecerem de configurar;
// em producao real (Railway), SESSION_SECRET deve estar sempre definido.
const segredoEfetivo = SEGREDO || crypto.randomBytes(32).toString("hex");

function assinar(valor: string): string {
  return crypto.createHmac("sha256", segredoEfetivo).update(valor).digest("hex");
}

/** Monta o valor "id.assinatura" pra gravar no cookie funcionario_id no login/cadastro. */
export function criarValorSessao(funcionarioId: number): string {
  const valor = String(funcionarioId);
  return `${valor}.${assinar(valor)}`;
}

/**
 * Confere a assinatura do cookie e devolve o id do funcionario, ou null se
 * o cookie nao existir, estiver mal formado ou tiver sido adulterado.
 */
export function verificarValorSessao(cookieValue: string | undefined): number | null {
  if (!cookieValue) return null;
  const separador = cookieValue.lastIndexOf(".");
  if (separador === -1) return null;

  const valor = cookieValue.slice(0, separador);
  const assinatura = cookieValue.slice(separador + 1);
  const esperada = assinar(valor);

  const bufRecebido = Buffer.from(assinatura);
  const bufEsperado = Buffer.from(esperada);
  if (bufRecebido.length !== bufEsperado.length || !crypto.timingSafeEqual(bufRecebido, bufEsperado)) {
    return null;
  }

  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}
