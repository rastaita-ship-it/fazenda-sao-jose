"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastContext";

interface EstadoFetch<T> {
  dados: T | null;
  carregando: boolean;
  erro: boolean;
  recarregar: () => void;
}

/**
 * Encapsula o padrao ja usado em app/talhoes, app/metas, app/animais
 * (loading + erro + recarregar) e adiciona o que faltava nas paginas mais
 * simples: catch de erro de rede com aviso visivel (toast) em vez de a
 * lista ficar vazia sem explicacao.
 */
export function useFetchList<T>(
  fetcher: () => Promise<T>,
  mensagemErro = "Nao foi possivel carregar os dados. Verifique sua conexao."
): EstadoFetch<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const toast = useToast();
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    fetcherRef
      .current()
      .then((resultado) => setDados(resultado))
      .catch(() => {
        setErro(true);
        toast.erro(mensagemErro);
      })
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagemErro]);

  useEffect(() => {
    // carregando/erro ja nascem em (true, false); chamar carregar() aqui so
    // pra buscar os dados, sem repetir os sets que o mount ja cobre.
    fetcherRef
      .current()
      .then((resultado) => setDados(resultado))
      .catch(() => {
        setErro(true);
        toast.erro(mensagemErro);
      })
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { dados, carregando, erro, recarregar: carregar };
}
