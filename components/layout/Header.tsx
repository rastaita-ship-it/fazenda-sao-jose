"use client";

import { usePathname, useRouter } from "next/navigation";

function IconeVoltar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5"></path>
      <path d="M12 19l-7-7 7-7"></path>
    </svg>
  );
}

export default function Header({
  titulo,
  subtitulo,
}: {
  titulo: string;
  subtitulo?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const mostrarVoltar = pathname !== "/";

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95
      px-4 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-2">
          {mostrarVoltar && (
            <button
              onClick={() => router.back()}
              aria-label="Voltar"
              className="-ml-2 flex-shrink-0 rounded-xl p-2 text-neutral-500 active:bg-neutral-100 dark:text-neutral-400 dark:active:bg-neutral-800"
            >
              <IconeVoltar />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Fazenda Sao Jose
            </p>
            <h1 className="truncate text-xl font-bold text-neutral-900 dark:text-neutral-50">
              {titulo}
            </h1>
          </div>
        </div>
        {subtitulo && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitulo}</p>
        )}
      </div>
    </header>
  );
}
