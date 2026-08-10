"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type TipoToast = "sucesso" | "erro" | "acao";

interface ItemToast {
  id: number;
  tipo: TipoToast;
  mensagem: string;
  aoClicar?: () => void;
}

interface ToastApi {
  sucesso: (mensagem: string) => void;
  erro: (mensagem: string) => void;
  /** Toast clicavel que nao some sozinho (ex: aviso de nova versao disponivel). */
  acao: (mensagem: string, aoClicar: () => void) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DURACAO_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemToast[]>([]);
  const proximoId = useRef(0);

  const remover = useCallback((id: number) => {
    setItens((atual) => atual.filter((item) => item.id !== id));
  }, []);

  const mostrar = useCallback(
    (tipo: TipoToast, mensagem: string, aoClicar?: () => void) => {
      const id = proximoId.current++;
      setItens((atual) => [...atual, { id, tipo, mensagem, aoClicar }]);
      if (tipo !== "acao") {
        setTimeout(() => remover(id), DURACAO_MS);
      }
    },
    [remover]
  );

  const api: ToastApi = {
    sucesso: (mensagem) => mostrar("sucesso", mensagem),
    erro: (mensagem) => mostrar("erro", mensagem),
    acao: (mensagem, aoClicar) => mostrar("acao", mensagem, aoClicar),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex w-full max-w-md flex-col gap-2 px-4">
        {itens.map((item) => (
          <div
            key={item.id}
            role="status"
            onClick={
              item.aoClicar
                ? () => {
                    item.aoClicar?.();
                    remover(item.id);
                  }
                : undefined
            }
            className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
              item.tipo === "erro"
                ? "bg-danger"
                : item.tipo === "acao"
                  ? "cursor-pointer bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900"
                  : "bg-brand-600"
            }`}
          >
            {item.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast precisa ser usado dentro de <ToastProvider>.");
  }
  return ctx;
}
