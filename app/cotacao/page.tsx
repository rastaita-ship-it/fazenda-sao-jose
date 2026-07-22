"use client";

import Header from "@/components/layout/Header";

const FONTES = [
  {
    nome: "Cafe Arabica",
    descricao: "Indicador CEPEA/Esalq - preco da saca de 60kg",
    url: "https://www.cepea.esalq.usp.br/br/indicador/cafe.aspx",
    icone: "\u2615",
  },
  {
    nome: "Boi Gordo",
    descricao: "Indicador CEPEA/Esalq - preco da arroba",
    url: "https://www.cepea.esalq.usp.br/br/indicador/boi-gordo.aspx",
    icone: "\u{1F404}",
  },
];

export default function CotacaoPage() {
  return (
    <>
      <Header titulo="Cotacao de Mercado" subtitulo="Fontes oficiais atualizadas" />
      <div className="space-y-3 p-4">
        <div className="card border-warning bg-warning/5">
          <p className="text-xs text-neutral-500">
            Nao existe fonte publica e gratuita confiavel para exibir esses precos
            automaticamente dentro do app. Por isso, os links abaixo levam direto
            para o indicador oficial do CEPEA/Esalq-USP, referencia do mercado.
          </p>
        </div>

        {FONTES.map((f) => (
          <a
            key={f.nome}
            href={f.url}
            target="_blank"
            rel="noreferrer"
            className="card flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{f.icone}</span>
              <div>
                <p className="text-sm font-semibold">{f.nome}</p>
                <p className="text-xs text-neutral-500">{f.descricao}</p>
              </div>
            </div>
            <span className="text-neutral-400">{">"}</span>
          </a>
        ))}
      </div>
    </>
  );
}
