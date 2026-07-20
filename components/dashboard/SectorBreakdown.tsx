import { ResumoFinanceiro } from "@/lib/types";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SectorBreakdown({ resumo }: { resumo: ResumoFinanceiro }) {
  return (
    <div className="card">
      <h2 className="mb-3 text-base font-semibold">Desempenho por setor</h2>
      <div className="space-y-3">
        {resumo.porSetor.map((s) => {
          const positivo = s.saldo >= 0;
          const total = s.receitas + s.despesas;
          const pctReceita = total > 0 ? (s.receitas / total) * 100 : 0;

          return (
            <div key={s.setor_id}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.cor }}
                  />
                  <span className="text-sm font-medium">{s.nome}</span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    positivo ? "text-brand-600 dark:text-brand-400" : "text-danger"
                  }`}
                >
                  {formatarMoeda(s.saldo)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${pctReceita}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
