"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/ToastContext";

export default function RegistrarServiceWorker() {
  const toast = useToast();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function avisarNovaVersao(worker: ServiceWorker) {
      toast.acao("Nova versão disponível — toque para atualizar", () => {
        worker.postMessage("SKIP_WAITING");
      });
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Ja existe um worker esperando (ex: usuario voltou pro app depois de uma atualizacao).
        if (registration.waiting && navigator.serviceWorker.controller) {
          avisarNovaVersao(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const novoWorker = registration.installing;
          if (!novoWorker) return;
          novoWorker.addEventListener("statechange", () => {
            // So avisa se ja havia um controller (ou seja, isso e uma atualizacao,
            // nao a primeira instalacao do service worker).
            if (novoWorker.state === "installed" && navigator.serviceWorker.controller) {
              avisarNovaVersao(novoWorker);
            }
          });
        });
      })
      .catch((erro) => {
        console.error("Erro ao registrar service worker:", erro);
      });

    let recarregando = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recarregando) return;
      recarregando = true;
      window.location.reload();
    });
  }, [toast]);

  return null;
}
