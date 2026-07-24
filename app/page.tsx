"use client";

import { useCallback, useEffect, useState } from "react";
import SummaryCards from "@/components/dashboard/SummaryCards";
import QuickAddButtons from "@/components/dashboard/QuickAddButtons";
import SectorBreakdown from "@/components/dashboard/SectorBreakdown";
import AvisoAtividadesHoje from "@/components/dashboard/AvisoAtividadesHoje";
import { useAuth } from "@/components/auth/AuthContext";
import { ResumoFinanceiro } from "@/lib/types";

const FAZENDA_LAT = -15.7639781;
const FAZENDA_LON = -39.4699029;

interface ClimaAtual {
  temperatura: number;
  umidade: number;
}

function CabecalhoLogo() {
  return (
    <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 py-3 text-center backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <img src="/logo.png" alt="Fazenda Sao Jose" className="mx-auto h-auto w-64" />
    </div>
  );
}

function useClimaAtual() {
  const [clima, setClima] = useState<ClimaAtual | null>(null);
  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${FAZENDA_LAT}&longitude=${FAZENDA_LON}&current=temperature_2m,relative_humidity_2m&timezone=auto`;
    fetch(url)
      .then((r) => r.json())
      .then((dados) => {
        setClima({
          temperatura: dados.current.temperature_2m,
          umidade: dados.current.relative_humidity_2m,
        });
      })
      .catch(() => setClima(null));
  }, []);
  return clima;
}

function CartaoClima({ clima }: { clima: ClimaAtual | null }) {
  return (
    <a
      href="/clima"
      className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-neutral-900"
    >
      <span className="text-2xl">{"\u2600\uFE0F"}</span>
      {clima ? (
        <>
          <span className="text-sm font-bold">{Math.round(clima.temperatura)}C</span>
          <span className="text-[10px] text-neutral-400">Umid. {Math.round(clima.umidade)}%</span>
        </>
      ) : (
        <span className="text-xs font-medium">Clima</span>
      )}
    </a>
  );
}

function PaginaAdmin() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [carregando, setCarregando] = useState(true);
  const clima = useClimaAtual();

  const carregarResumo = useCallback(() => {
    setCarregando(true);
    fetch("/api/summary")
      .then((r) => r.json())
      .then(setResumo)
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  return (
    <>
      <CabecalhoLogo />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <CartaoClima clima={clima} />
          <a
            href="/indicadores"
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-neutral-900"
          >
            <span className="text-2xl">{"\u{1F4C8}"}</span>
            <span className="text-xs font-medium">Indicadores</span>
          </a>
          <a
            href="/cotacao"
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-neutral-900"
          >
            <span className="text-2xl">{"\u{1F4B9}"}</span>
            <span className="text-xs font-medium">Cotacao</span>
          </a>
        </div>

        <QuickAddButtons onSaved={carregarResumo} />

        {carregando || !resumo ? (
          <div className="card animate-pulse text-center text-sm text-neutral-400">
            Carregando dados da fazenda...
          </div>
        ) : (
          <>
            <SummaryCards resumo={resumo} />
            <SectorBreakdown resumo={resumo} onAtualizado={carregarResumo} />
          </>
        )}

        <a
          href="/mentor"
          className="block w-full rounded-2xl bg-brand-600 py-4 text-center text-base font-bold text-white active:opacity-80"
        >
          {"\u{1F9D1}\u200D\u{1F33E}"} Mentor Rural
        </a>

        <div className="grid grid-cols-2 gap-2">
          <a
            href="/emergencia"
            className="rounded-2xl bg-danger py-4 text-center text-base font-bold text-white active:opacity-80"
          >
            {"\u{1F6A8}"} Emergencia
          </a>
          <a
            href="/mural"
            className="rounded-2xl bg-brand-600 py-4 text-center text-base font-bold text-white active:opacity-80"
          >
            {"\u{1F4CC}"} Mural
          </a>
        </div>
      </div>
    </>
  );
}

function PaginaCampo() {
  const clima = useClimaAtual();

  return (
    <>
      <CabecalhoLogo />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <CartaoClima clima={clima} />
          <a
            href="/ponto"
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-neutral-900"
          >
            <span className="text-2xl">{"\u{1F550}"}</span>
            <span className="text-xs font-medium">Ponto</span>
          </a>
          <a
            href="/manejo"
            className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-neutral-900"
          >
            <span className="text-2xl">{"\u{1F4C5}"}</span>
            <span className="text-xs font-medium">Manejo</span>
          </a>
        </div>

        <a
          href="/mentor"
          className="block w-full rounded-2xl bg-brand-600 py-5 text-center text-lg font-bold text-white active:opacity-80"
        >
          {"\u{1F9D1}\u200D\u{1F33E}"} Mentor Rural
        </a>

        <AvisoAtividadesHoje />

        <div className="grid grid-cols-2 gap-2">
          <a
            href="/emergencia"
            className="rounded-2xl bg-danger py-4 text-center text-base font-bold text-white active:opacity-80"
          >
            {"\u{1F6A8}"} Emergencia
          </a>
          <a
            href="/mural"
            className="rounded-2xl bg-brand-600 py-4 text-center text-base font-bold text-white active:opacity-80"
          >
            {"\u{1F4CC}"} Mural
          </a>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const usuario = useAuth();
  if (usuario?.tipo === "chefe") return <PaginaAdmin />;
  return <PaginaCampo />;
}
