# Fazenda São José — App de Controle Econômico

PWA mobile-first para controle financeiro e operacional da fazenda.
Stack: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + SQLite (better-sqlite3)**.

## Como rodar (no seu Mac)

```bash
cd fazenda-sao-jose
npm install
npm run dev
```

Abra http://localhost:3000 — o banco SQLite é criado automaticamente em
`data/fazenda.db` na primeira execução, já com os setores Café, Gado e
Ovelhas cadastrados.

Para testar como PWA no celular: rode `npm run build && npm start`, exponha
a porta na sua rede local (ex: `npm start -- -H 0.0.0.0`) e acesse pelo
navegador do celular usando o IP do Mac. Depois use "Adicionar à Tela de
Início" no Safari/Chrome.

## Estrutura do projeto

```
fazenda-sao-jose/
├── app/
│   ├── page.tsx                 # Dashboard (Resumo Geral)
│   ├── layout.tsx               # Layout raiz + navegação inferior
│   ├── globals.css              # Tailwind + estilos base mobile
│   ├── setores/page.tsx         # Controle por setor
│   ├── fluxo-caixa/page.tsx     # Ledger completo
│   ├── relatorios/page.tsx      # Gráficos de lucratividade
│   └── api/
│       ├── sectors/route.ts     # CRUD de setores
│       ├── transactions/route.ts# CRUD do fluxo de caixa
│       └── summary/route.ts     # Agregados para o dashboard
├── components/
│   ├── dashboard/                (SummaryCards, QuickAddButtons, SectorBreakdown)
│   └── layout/                   (Header, BottomNav)
├── lib/
│   ├── db.ts                    # Conexão SQLite + schema/migrations
│   └── types.ts                 # Tipos compartilhados
├── data/fazenda.db              # Banco local (gerado, git-ignorado)
└── public/manifest.json         # Manifesto PWA
```

## Modelo de dados (SQLite)

- **setores** — Café, Gado, Ovelhas, e culturas adicionadas livremente
  (`tipo = 'outra_cultura'`).
- **transacoes** — ledger único de receitas/despesas. Toda transação é
  obrigatoriamente vinculada a um setor (`setor_id`) e tem `status`
  (`pago` | `pendente` | `previsto`).
- **lancamentos_operacionais** — tabela genérica (métrica/valor/unidade)
  para dados operacionais como sacas colhidas, peso médio, cabeças de gado
  etc., sem precisar criar uma tabela nova por setor.

## Próximos passos sugeridos (expansão incremental)

1. Formulário "+ Adicionar setor" na página Setores (endpoint já existe:
   `POST /api/sectors`).
2. Tela de detalhe por setor com os `lancamentos_operacionais`
   (ex: sacas de café colhidas, peso do rebanho).
3. Edição/exclusão de lançamentos no Fluxo de Caixa.
4. Filtro de período (mês/ano) no Dashboard e Relatórios.
5. Balanço anual comparando safras ano a ano.
6. Autenticação simples (PIN) já que os dados ficam locais.
7. Ícones reais em `public/icons/` (192x192 e 512x512) para o PWA.
8. Service worker (`next-pwa`) para funcionamento offline no campo.
