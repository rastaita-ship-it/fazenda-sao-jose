import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AuthGate from "./AuthGate";

// Regressao do bug corrigido em components/auth/AuthGate.tsx: logo depois
// de um login valido, a troca de pathname de /login para / fazia o app
// voltar sozinho pro /login. A causa era um segundo useEffect reagindo a
// `usuario`, que rodava na mesma passada da troca de pathname usando o
// valor de ANTES da navegacao (null, por estar em /login). Esse teste
// simula exatamente essa sequencia e falha se a regressao voltar.

const pushMock = vi.fn();
// O router real do Next.js mantem a mesma referencia entre renders; o mock
// precisa fazer o mesmo, senao o efeito de AuthGate re-dispara a cada
// render (ja que `router` esta no array de dependencias) e nao so quando o
// pathname muda de verdade.
const routerMock = { push: pushMock };
let pathnameAtual = "/login";

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameAtual,
  useRouter: () => routerMock,
}));

function respostaFetch(dados: unknown) {
  return { json: async () => dados } as unknown as Response;
}

describe("AuthGate", () => {
  beforeEach(() => {
    pushMock.mockClear();
    pathnameAtual = "/login";
  });

  it("nao chama router.push('/login') quando o fetch da pagina nova ainda esta em voo", async () => {
    let resolverChamada1!: (v: Response) => void;
    let resolverChamada2!: (v: Response) => void;
    let numeroChamada = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        numeroChamada += 1;
        if (numeroChamada === 1) {
          return new Promise<Response>((resolve) => {
            resolverChamada1 = resolve;
          });
        }
        return new Promise<Response>((resolve) => {
          resolverChamada2 = resolve;
        });
      })
    );

    const { rerender } = render(
      <AuthGate>
        <div>conteudo protegido</div>
      </AuthGate>
    );

    // Ainda em /login: o fetch dessa pagina resolve sem usuario logado.
    resolverChamada1(respostaFetch(null));
    await waitFor(() => expect(numeroChamada).toBe(1));

    // Usuario acabou de logar (PIN correto) e o app navega pro dashboard.
    pathnameAtual = "/";
    rerender(
      <AuthGate>
        <div>conteudo protegido</div>
      </AuthGate>
    );
    await waitFor(() => expect(numeroChamada).toBe(2));

    // Nesse ponto, se o bug antigo estivesse presente, o redirecionamento
    // pro /login ja teria acontecido ANTES do fetch abaixo resolver.
    expect(pushMock).not.toHaveBeenCalledWith("/login");

    // O fetch da nova pagina finalmente resolve com o usuario logado.
    resolverChamada2(respostaFetch({ id: 3, nome: "Valmir", tipo: "chefe" }));

    await waitFor(() => expect(screen.getByText("conteudo protegido")).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalledWith("/login");
  });

  it("redireciona pro /login quando o usuario realmente nao esta autenticado", async () => {
    pathnameAtual = "/fluxo-caixa";
    vi.stubGlobal("fetch", vi.fn(async () => respostaFetch(null)));

    render(
      <AuthGate>
        <div>conteudo protegido</div>
      </AuthGate>
    );

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });
});
