import { ResumoFinanceiro } from "@/lib/types";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SummaryCards({ resumo }: { resumo: ResumoFinanceiro }) {
  const saldoPositivo = resumo.saldo >= 0;

  return (
    <div className="card text-center">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Saldo do mes</p>
      <p
        className={`text-3xl font-bold ${
          saldoPositivo ? "text-brand-600 dark:text-brand-400" : "text-danger"
        }`}
      >
        {formatarMoeda(resumo.saldo)}
      </p>
    </div>
  );
}
