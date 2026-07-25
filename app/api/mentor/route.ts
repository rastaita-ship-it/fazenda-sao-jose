import { NextRequest, NextResponse } from "next/server";

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
    text: `Voce e um mentor tecnico rural, especializado em cafe, gado de corte/leite, ovinocultura e maquinas agricolas no Brasil. Responda de forma pratica, direta e curta (maximo 6 frases), em portugues. Se uma foto foi enviada, analise ela com cuidado antes de responder. Pergunta do produtor: "${pergunta.trim()}"`,
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
