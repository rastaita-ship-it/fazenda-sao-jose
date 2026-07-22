export type TipoSetor = "cafe" | "gado" | "ovelhas" | "outra_cultura";
export type TipoTransacao = "receita" | "despesa";
export type StatusTransacao = "pago" | "pendente" | "previsto";

export interface Setor {
  id: number;
  nome: string;
  tipo: TipoSetor;
  cor: string;
  ativo: number; // 0 | 1 (SQLite boolean)
  criado_em: string;
}

export interface Transacao {
  id: number;
  setor_id: number;
  tipo: TipoTransacao;
  categoria: string | null;
  descricao: string;
  valor: number;
  data: string; // YYYY-MM-DD
  status: StatusTransacao;
  criado_em: string;
  recibo_url: string | null;
}

export interface TransacaoComSetor extends Transacao {
  setor_nome: string;
  setor_cor: string;
}

export interface LancamentoOperacional {
  id: number;
  setor_id: number;
  transacao_id: number | null;
  metrica: string;
  valor_num: number | null;
  unidade: string | null;
  data: string;
  observacao: string | null;
  criado_em: string;
}

export interface ResumoFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  porSetor: {
    setor_id: number;
    nome: string;
    cor: string;
    receitas: number;
    despesas: number;
    saldo: number;
  }[];
}
