"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [carregandoStatus, setCarregandoStatus] = useState(true);
  const [precisaConfigurar, setPrecisaConfigurar] = useState(false);

  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  const [nomeAdmin, setNomeAdmin] = useState("");
  const [pinAdmin, setPinAdmin] = useState("");
  const [pinAdminConfirma, setPinAdminConfirma] = useState("");
  const [criando, setCriando] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/setup-status")
      .then((r) => r.json())
      .then((dados) => setPrecisaConfigurar(dados.precisaConfigurar))
      .finally(() => setCarregandoStatus(false));
  }, []);

  async function entrar(pinCompleto: string) {
    setEntrando(true);
    setErro("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinCompleto }),
      });
      const dados = await res.json();

      if (!res.ok) {
        setErro(dados.error ?? "Erro ao entrar.");
        setPin("");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setEntrando(false);
    }
  }

  function aoDigitar(d: string) {
    if (pin.length >= 4) return;
    setErro("");
    const novoPin = pin + d;
    setPin(novoPin);
    if (novoPin.length === 4) {
      entrar(novoPin);
    }
  }

  function apagarDigito() {
    setErro("");
    setPin((atual) => atual.slice(0, -1));
  }

  async function criarAdmin() {
    setErro("");
    if (!nomeAdmin.trim()) {
      setErro("Digite seu nome.");
      return;
    }
    if (!/^[0-9]{4}$/.test(pinAdmin)) {
      setErro("O PIN deve ter exatamente 4 numeros.");
      return;
    }
    if (pinAdmin !== pinAdminConfirma) {
      setErro("Os dois PINs digitados nao sao iguais.");
      return;
    }

    setCriando(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeAdmin.trim(),
          tipo: "chefe",
          pin: pinAdmin,
        }),
      });
      const dados = await res.json();
      if (!res.ok) {
        setErro(dados.error ?? "Erro ao criar administrador.");
        return;
      }
      await entrar(pinAdmin);
    } finally {
      setCriando(false);
    }
  }

  if (carregandoStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-sm text-neutral-400">Carregando...</p>
      </div>
    );
  }

  if (precisaConfigurar) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Fazenda Sao Jose
            </p>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              Primeiro acesso
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Crie a conta de administrador para comecar
            </p>
          </div>

          <div className="space-y-3">
            <input
              className="input-field"
              placeholder="Seu nome"
              value={nomeAdmin}
              onChange={(e) => setNomeAdmin(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Crie um PIN de 4 numeros"
              inputMode="numeric"
              maxLength={4}
              value={pinAdmin}
              onChange={(e) => setPinAdmin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            />
            <input
              className="input-field"
              placeholder="Confirme o PIN"
              inputMode="numeric"
              maxLength={4}
              value={pinAdminConfirma}
              onChange={(e) => setPinAdminConfirma(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            />
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <button className="btn-primary w-full" disabled={criando} onClick={criarAdmin}>
              {criando ? "Criando..." : "Criar administrador"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
          Fazenda Sao Jose
        </p>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Digite seu PIN
        </h1>
      </div>

      <div className="mb-6 flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 ${
              i < pin.length
                ? "border-brand-600 bg-brand-600"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          />
        ))}
      </div>

      {erro && <p className="mb-4 text-sm font-medium text-danger">{erro}</p>}
      {entrando && <p className="mb-4 text-sm text-neutral-400">Entrando...</p>}

      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <button
            key={n}
            onClick={() => aoDigitar(n)}
            disabled={entrando}
            className="h-16 w-16 rounded-full bg-white text-xl font-semibold shadow-sm active:scale-95 dark:bg-neutral-900"
          >
            {n}
          </button>
        ))}
        <button
          onClick={apagarDigito}
          disabled={entrando}
          className="h-16 w-16 rounded-full text-sm font-medium text-neutral-400"
        >
          apagar
        </button>
        <button
          onClick={() => aoDigitar("0")}
          disabled={entrando}
          className="h-16 w-16 rounded-full bg-white text-xl font-semibold shadow-sm active:scale-95 dark:bg-neutral-900"
        >
          0
        </button>
      </div>
    </div>
  );
}
