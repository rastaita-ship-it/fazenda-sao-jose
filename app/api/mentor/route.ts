import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Voce e o Mentor Rural, um assistente especializado em agropecuaria brasileira, criado para a Fazenda Sao Jose.

Sua especialidade e:
- Reconhecimento de especies: plantas, pragas, insetos, fungos, doencas e animais (aves, cobras, mamiferos) comuns no campo brasileiro
- Cafeicultura: poda, adubacao, colheita, pragas e doencas do cafeeiro
- Pecuaria de corte e leite: manejo, vacinacao, nutricao, reproducao
- Ovinocultura: tosquia, vacinacao, manejo de rebanho
- Maquinas e ferramentas agricolas: manutencao basica, uso correto, seguranca

Regras de resposta:
- Quando receber uma foto, analise com atencao antes de responder. Tente identificar a especie, praga, doenca ou problema visivel com o maximo de precisao possivel, e diga claramente se nao tiver certeza.
- Respostas praticas, diretas e curtas: no maximo 6 frases.
- Sempre em portugues do Brasil, linguagem simples, sem jargao desnecessario.
- Se a pergunta nao tiver nenhuma relacao com agropecuaria, natureza ou vida rural, responda educadamente que voce so pode ajudar com temas rurais e sugira reformular a pergunta.
- Nunca invente um diagnostico com certeza absoluta quando a foto for pouco clara; nesses casos, recomende buscar um veterinario, agronomo ou tecnico agricola.`;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const pergunta = formData.get("pergunta") as string | null;
  const foto = formData.get("foto") as File | null;

  if (!pergunta || !pergunta.trim()) {
    return NextResponse.json({ error: "pergunta e obrigatoria" }, { status: 400 });
  }

  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    return NextResponse.json(
      { error: "Chave de IA nao configurada no servidor." },
      { status: 500 }
    );
  }

  const conteudo: Record<string, unknown>[] = [];

  if (foto) {
    const bytes = await foto.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    conteudo.push({
      type: "image",
      source: {
        type: "base64",
        media_type: foto.type || "image/jpeg",
        data: base64,
      },
    });
  }

  conteudo.push({
    type: "text",
    text: pergunta.trim(),
  });

  try {
    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": chave,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: conteudo }],
      }),
    });

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      console.error("Erro Claude:", erroTexto);
      return NextResponse.json({ error: "Erro ao consultar a IA." }, { status: 502 });
    }

    const dados = await resposta.json();
    const texto = dados.content?.[0]?.text ?? "Nao foi possivel gerar uma resposta.";

    return NextResponse.json({ resposta: texto });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao consultar a IA." }, { status: 500 });
  }
}
