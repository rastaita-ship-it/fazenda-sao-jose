type TipoColuna = "texto" | "numero" | "inteiro" | "data" | "enum" | "setor";

interface ColunaImportacao {
  chave: string;
  obrigatorio: boolean;
  tipo: TipoColuna;
  opcoes?: string[];
  campoDestino?: string;
}

interface EspecificacaoImportacao {
  titulo: string;
  tabela: string;
  colunas: ColunaImportacao[];
  exemplo: string[];
}

export const ESPECIFICACOES: Record<"patrimonio" | "estoque_insumos" | "estoque_producao", EspecificacaoImportacao> = {
  patrimonio: {
    titulo: "Patrimônio (máquinas, veículos, equipamentos...)",
    tabela: "patrimonio",
    colunas: [
      { chave: "nome", obrigatorio: true, tipo: "texto" },
      {
        chave: "tipo",
        obrigatorio: true,
        tipo: "enum",
        opcoes: ["trator", "maquina", "ferramenta", "veiculo", "instalacao", "area_cultivo", "pasto", "outro"],
      },
      { chave: "identificador", obrigatorio: false, tipo: "texto" },
      { chave: "data_aquisicao", obrigatorio: false, tipo: "data" },
      { chave: "valor_aquisicao", obrigatorio: false, tipo: "numero" },
      { chave: "vida_util_meses", obrigatorio: false, tipo: "inteiro" },
      { chave: "horimetro_km_atual", obrigatorio: false, tipo: "numero" },
      { chave: "observacao", obrigatorio: false, tipo: "texto" },
    ],
    exemplo: ["Trator Massey 275", "trator", "TR-01", "2020-03-15", "180000", "120", "1500", "Comprado usado"],
  },
  estoque_insumos: {
    titulo: "Estoque de insumos (adubo, semente, ração...)",
    tabela: "estoque_insumos",
    colunas: [
      { chave: "nome", obrigatorio: true, tipo: "texto" },
      {
        chave: "categoria",
        obrigatorio: true,
        tipo: "enum",
        opcoes: ["fertilizante", "semente", "defensivo", "racao", "medicamento", "combustivel", "outro"],
      },
      { chave: "unidade", obrigatorio: true, tipo: "texto" },
      { chave: "quantidade_atual", obrigatorio: false, tipo: "numero" },
      { chave: "quantidade_minima", obrigatorio: false, tipo: "numero" },
      { chave: "custo_unitario", obrigatorio: false, tipo: "numero" },
      { chave: "setor", obrigatorio: false, tipo: "setor", campoDestino: "setor_id" },
      { chave: "observacao", obrigatorio: false, tipo: "texto" },
    ],
    exemplo: ["Ureia", "fertilizante", "kg", "500", "100", "3,20", "Cafe", "Estoque inicial"],
  },
  estoque_producao: {
    titulo: "Estoque de produção (café, leite, lã...)",
    tabela: "estoque_producao",
    colunas: [
      { chave: "produto", obrigatorio: true, tipo: "texto" },
      { chave: "unidade", obrigatorio: true, tipo: "texto" },
      { chave: "quantidade_atual", obrigatorio: false, tipo: "numero" },
      { chave: "setor", obrigatorio: false, tipo: "setor", campoDestino: "setor_id" },
      { chave: "local_armazenamento", obrigatorio: false, tipo: "texto" },
      { chave: "observacao", obrigatorio: false, tipo: "texto" },
    ],
    exemplo: ["Cafe beneficiado", "sc", "80", "Cafe", "Tulha 1", "Safra anterior"],
  },
};

export type TipoImportacao = keyof typeof ESPECIFICACOES;

export type ValorImportado = string | number | null;

export function validarLinha(
  tipo: TipoImportacao,
  valores: Record<string, string>,
  setoresPorNome: Map<string, number>
): { ok: true; dados: Record<string, ValorImportado> } | { ok: false; erros: string[] } {
  const especificacao = ESPECIFICACOES[tipo];
  const dados: Record<string, ValorImportado> = {};
  const erros: string[] = [];

  for (const coluna of especificacao.colunas) {
    const bruto = (valores[coluna.chave] ?? "").trim();
    const destino = coluna.campoDestino ?? coluna.chave;

    if (!bruto) {
      if (coluna.obrigatorio) {
        erros.push(`"${coluna.chave}" e obrigatorio.`);
      } else {
        dados[destino] = null;
      }
      continue;
    }

    if (coluna.tipo === "texto") {
      dados[destino] = bruto;
    } else if (coluna.tipo === "numero") {
      const numero = Number(bruto.replace(",", "."));
      if (Number.isNaN(numero)) {
        erros.push(`"${coluna.chave}" deve ser um numero (valor recebido: "${bruto}").`);
      } else {
        dados[destino] = numero;
      }
    } else if (coluna.tipo === "inteiro") {
      const numero = Number(bruto.replace(",", "."));
      if (!Number.isInteger(numero)) {
        erros.push(`"${coluna.chave}" deve ser um numero inteiro (valor recebido: "${bruto}").`);
      } else {
        dados[destino] = numero;
      }
    } else if (coluna.tipo === "data") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) {
        erros.push(`"${coluna.chave}" deve estar no formato AAAA-MM-DD (valor recebido: "${bruto}").`);
      } else {
        dados[destino] = bruto;
      }
    } else if (coluna.tipo === "enum") {
      const valorNormalizado = bruto.toLowerCase();
      if (!coluna.opcoes!.includes(valorNormalizado)) {
        erros.push(`"${coluna.chave}" deve ser um dos valores: ${coluna.opcoes!.join(", ")} (valor recebido: "${bruto}").`);
      } else {
        dados[destino] = valorNormalizado;
      }
    } else if (coluna.tipo === "setor") {
      const setorId = setoresPorNome.get(bruto.toLowerCase());
      if (!setorId) {
        erros.push(`Setor "${bruto}" nao encontrado. Cadastre o setor antes ou deixe em branco.`);
      } else {
        dados[destino] = setorId;
      }
    }
  }

  if (erros.length > 0) return { ok: false, erros };
  return { ok: true, dados };
}
