"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";

function urlBase64ParaUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = window.atob(base64);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

type Estado = "verificando" | "suportado" | "inscrito" | "negado" | "nao_suportado";

export default function NotificacoesPush() {
  const usuario = useAuth();
  const [estado, setEstado] = useState<Estado>("verificando");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function verificar() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado("nao_suportado");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("negado");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const subscription = await registro.pushManager.getSubscription();
      setEstado(subscription ? "inscrito" : "suportado");
    }
    verificar().catch(() => setEstado("nao_suportado"));
  }, []);

  async function ativar() {
    setCarregando(true);
    setMensagem("");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado("negado");
        return;
      }

      const { publicKey } = await fetch("/api/push/vapid-public-key").then((r) => r.json());
      const registro = await navigator.serviceWorker.ready;
      const subscription = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ParaUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setEstado("inscrito");
    } catch {
      setMensagem("Nao foi possivel ativar as notificacoes.");
    } finally {
      setCarregando(false);
    }
  }

  async function desativar() {
    setCarregando(true);
    setMensagem("");
    try {
      const registro = await navigator.serviceWorker.ready;
      const subscription = await registro.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setEstado("suportado");
    } finally {
      setCarregando(false);
    }
  }

  async function enviarTeste() {
    setCarregando(true);
    setMensagem("");
    try {
      await fetch("/api/push/testar", { method: "POST" });
      setMensagem("Notificacao de teste enviada.");
    } finally {
      setCarregando(false);
    }
  }

  if (estado === "verificando") return null;

  return (
    <div className="card">
      <p className="mb-1 text-sm font-semibold">Notificações</p>
      {estado === "nao_suportado" && (
        <p className="text-xs text-neutral-500">Seu navegador não suporta notificações push.</p>
      )}
      {estado === "negado" && (
        <p className="text-xs text-neutral-500">
          As notificações estão bloqueadas nas permissões do navegador. Ative manualmente pra receber avisos.
        </p>
      )}
      {estado === "suportado" && (
        <>
          <p className="mb-2 text-xs text-neutral-500">
            Receba avisos de manejo do dia, estoque baixo e documentos vencendo mesmo com o app fechado.
          </p>
          <button className="btn-primary w-full" disabled={carregando} onClick={ativar}>
            {carregando ? "Ativando..." : "Ativar notificações"}
          </button>
        </>
      )}
      {estado === "inscrito" && (
        <>
          <p className="mb-2 text-xs text-brand-600 dark:text-brand-400">Notificações ativadas neste dispositivo.</p>
          <div className="space-y-2">
            {usuario?.tipo === "chefe" && (
              <button
                className="w-full rounded-xl border border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                disabled={carregando}
                onClick={enviarTeste}
              >
                Enviar notificação de teste
              </button>
            )}
            <button
              className="w-full rounded-xl border border-danger py-2.5 text-sm font-medium text-danger"
              disabled={carregando}
              onClick={desativar}
            >
              Desativar neste dispositivo
            </button>
          </div>
        </>
      )}
      {mensagem && <p className="mt-2 text-xs text-neutral-500">{mensagem}</p>}
    </div>
  );
}
