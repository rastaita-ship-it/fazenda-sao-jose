"use client";

import { useEffect } from "react";

export default function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((erro) => {
        console.error("Erro ao registrar service worker:", erro);
      });
    }
  }, []);

  return null;
}
