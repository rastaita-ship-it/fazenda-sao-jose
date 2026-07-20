"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", label: "Resumo", icon: "\u{1F3E0}" },
  { href: "/setores", label: "Setores", icon: "\u{1F33E}" },
  { href: "/fluxo-caixa", label: "Fluxo", icon: "\u{1F4B0}" },
  { href: "/ponto", label: "Ponto", icon: "\u{1F550}" },
  { href: "/manejo", label: "Manejo", icon: "\u{1F4C5}" },
  { href: "/patrimonio", label: "Patrimonio", icon: "\u{1F69C}" },
  { href: "/estoque-insumos", label: "Insumos", icon: "\u{1F6E2}\u{FE0F}" },
  { href: "/estoque-producao", label: "Producao", icon: "\u{1F4E6}" },
  { href: "/balanco", label: "Balanco", icon: "\u{2696}\u{FE0F}" },
  { href: "/relatorios", label: "Relatorios", icon: "\u{1F4CA}" },
  { href: "/indicadores", label: "Indicadores", icon: "\u{1F4C8}" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200
        bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md justify-start overflow-x-auto">
        {ITENS.map((item) => {
          const ativo = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-shrink-0 flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition
                ${ativo ? "text-brand-600 dark:text-brand-400" : "text-neutral-500 dark:text-neutral-400"}`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
