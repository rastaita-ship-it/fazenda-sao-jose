import { ResumoFinanceiro } from "@/lib/types";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SummaryCards({ resumo }: { resumo: ResumoFinanceiro }) {
  const saldoPositivo = resumo.saldo >= 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card col-span-2">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Saldo do mês
        </p>
        <p
          className={`text-3xl font-bold ${
            saldoPositivo ? "text-brand-600 dark:text-brand-400" : "text-danger"
          }`}
        >
          {formatarMoeda(resumo.saldo)}
        </p>
      </div>

      <div className="card">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Receitas</p>
        <p className="text-lg font-semibold text-brand-600 dark:text-brand-400">
          {formatarMoeda(resumo.totalReceitas)}
        </p>
      </div>

      <div className="card">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Despesas</p>
        <p className="text-lg font-semibold text-danger">
          {formatarMoeda(resumo.totalDespesas)}
        </p>
      </div>
    </div>
  );
}
