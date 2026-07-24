import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const pergunta = formData.get("pergunta") as string | null;
  const foto = formData.get("foto") as File | null;

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

  const partes: Record<string, unknown>[] = [
    {
      text: `Voce e um mentor tecnico rural, especializado em cafe, gado de corte/leite, ovinocultura e maquinas agricolas no Brasil. Responda de forma pratica, direta e curta (maximo 6 frases), em portugues. Se for enviada uma foto, analise ela com cuidado antes de responder. Pergunta do produtor: "${pergunta.trim()}"`,
    },
  ];

  if (foto) {
    const bytes = await foto.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    partes.push({
      inline_data: {
        mime_type: foto.type || "image/jpeg",
        data: base64,
      },
    });
  }

  try {
    const resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${chave}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: partes }],
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
