import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pergunta } = body;

  if (!pergunta || !pergunta.trim()) {
    return NextResponse.json({ error: "pergunta e obrigatoria" }, { status: 400 });
  }

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) {
    return NextResponse.json(
      { error: "Chave de IA nao configurada no servidor." },
      { status: 500 }
    );
  }

  const prompt = `Voce e um assistente tecnico agropecuario, especializado em cafe, gado de corte/leite e ovinocultura no Brasil. Responda de forma pratica, direta e curta (maximo 6 frases), em portugues, sobre o seguinte assunto relacionado ao manejo de uma fazenda: "${pergunta.trim()}". Se o assunto nao tiver relacao com agropecuaria, responda educadamente que so pode ajudar com temas rurais.`;

  try {
    const resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${chave}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      console.error("Erro Gemini:", erroTexto);
      return NextResponse.json({ error: "Erro ao consultar a IA." }, { status: 502 });
    }

    const dados = await resposta.json();
    const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text ?? "Nao foi possivel gerar uma resposta.";

    return NextResponse.json({ resposta: texto });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao consultar a IA." }, { status: 500 });
  }
}
