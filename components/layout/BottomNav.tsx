"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";

const ITENS_TODOS = [
  { href: "/", label: "Resumo", icon: "\u{1F3E0}", admin: false },
  { href: "/setores", label: "Setores", icon: "\u{1F33E}", admin: true },
  { href: "/fluxo-caixa", label: "Fluxo", icon: "\u{1F4B0}", admin: true },
  { href: "/ponto", label: "Ponto", icon: "\u{1F550}", admin: false },
  { href: "/manejo", label: "Manejo", icon: "\u{1F4C5}", admin: false },
  { href: "/patrimonio", label: "Patrimonio", icon: "\u{1F69C}", admin: true },
  { href: "/estoque", label: "Estoque", icon: "\u{1F4E6}", admin: true },
  { href: "/balanco", label: "Balanco", icon: "\u{2696}\u{FE0F}", admin: true },
  { href: "/indicadores", label: "Indicadores", icon: "\u{1F4C8}", admin: true },
  { href: "/relatorios", label: "Relatorios", icon: "\u{1F4CA}", admin: true },
  { href: "/configuracoes", label: "Config", icon: "\u{2699}\u{FE0F}", admin: false },
];

export default function BottomNav() {
  const pathname = usePathname();
  const usuario = useAuth();
  const ehAdmin = usuario?.tipo === "chefe";

  const itens = ITENS_TODOS.filter((item) => !item.admin || ehAdmin);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200
        bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md justify-start overflow-x-auto">
        {itens.map((item) => {
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
