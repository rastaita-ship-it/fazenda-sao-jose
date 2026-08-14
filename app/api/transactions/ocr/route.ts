import { NextRequest, NextResponse } from "next/server";
import { ehAdminLogado } from "@/lib/auth-helpers";

const SYSTEM_PROMPT = `Voce le recibos e notas fiscais brasileiros para lancamento no financeiro de uma fazenda. Responda APENAS com um JSON valido, sem nenhum texto antes ou depois, exatamente neste formato:
{"valor": <numero ou null>, "data": "<YYYY-MM-DD ou null>", "descricao": "<string curta ou null>"}

Regras:
- valor: o valor TOTAL pago, em reais, como numero (ex: 150.90, sem "R$"). Se nao conseguir ler com confianca, use null.
- data: a data da compra/emissao no formato YYYY-MM-DD. Se nao tiver certeza do ano, assuma o ano mais recente plausivel. Se nao conseguir ler, use null.
- descricao: um resumo curto (ate 6 palavras) do que foi comprado ou do estabelecimento, util pra um lancamento financeiro (ex: "Adubo - Agropecuaria Central"). Se nao conseguir identificar, use null.
- Nunca invente valores que nao estao visiveis na imagem. Na duvida, use null nesse campo.`;

export async function POST(req: NextRequest) {
  if (!ehAdminLogado(req)) {
    return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  }

  const formData = await req.formData();
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo) {
    return NextResponse.json({ error: "arquivo e obrigatorio" }, { status: 400 });
  }

  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    return NextResponse.json({ error: "Chave de IA nao configurada no servidor." }, { status: 500 });
  }

  const bytes = await arquivo.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

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
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: arquivo.type || "image/jpeg", data: base64 },
              },
              { type: "text", text: "Leia este recibo/nota e extraia os dados no formato pedido." },
            ],
          },
        ],
      }),
    });

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      console.error("Erro Claude (OCR recibo):", erroTexto);
      return NextResponse.json({ error: "Nao foi possivel ler o recibo." }, { status: 502 });
    }

    const dados = await resposta.json();
    const texto: string = dados.content?.[0]?.text ?? "";

    let extraido: { valor?: number | null; data?: string | null; descricao?: string | null } = {};
    try {
      const limpo = texto.trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
      extraido = JSON.parse(limpo);
    } catch (e) {
      console.error("Resposta da IA nao era JSON valido (OCR recibo):", texto, e);
    }

    return NextResponse.json({
      valor: typeof extraido.valor === "number" ? extraido.valor : null,
      data: typeof extraido.data === "string" ? extraido.data : null,
      descricao: typeof extraido.descricao === "string" ? extraido.descricao : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Nao foi possivel ler o recibo." }, { status: 500 });
  }
}
