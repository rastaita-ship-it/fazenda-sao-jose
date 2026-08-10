"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import SummaryCards from "@/components/dashboard/SummaryCards";
import QuickAddButtons from "@/components/dashboard/QuickAddButtons";
import SectorBreakdown from "@/components/dashboard/SectorBreakdown";
import AvisoAtividadesHoje from "@/components/dashboard/AvisoAtividadesHoje";
import AvisoDocumentosVencendo from "@/components/dashboard/AvisoDocumentosVencendo";
import ResumoMetas from "@/components/dashboard/ResumoMetas";
import { useAuth } from "@/components/auth/AuthContext";
import { ResumoFinanceiro } from "@/lib/types";

const FAZENDA_LAT = -15.7639781;
const FAZENDA_LON = -39.4699029;

interface ClimaAtual {
  temperatura: number;
  umidade: number;
}

function CabecalhoLogo({ mostrarConfig }: { mostrarConfig?: boolean }) {
  return (
    <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 py-3 text-center backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <Image
        src="/logo.png"
        alt="Fazenda Sao Jose"
        width={450}
        height={229}
        priority
        className="mx-auto h-auto w-64"
      />
      {mostrarConfig && (
        <a
          href="/configuracoes"
          aria-label="Configuracoes"
          className="absolute right-4 top-4 rounded-full bg-white p-2 text-xl shadow-sm dark:bg-neutral-900"
        >
          {"\u2699\uFE0F"}
        </a>
      )}
    </div>
  );
}

const CHAVE_CACHE_CLIMA = "clima_atual_cache";
const VALIDADE_CACHE_CLIMA_MS = 30 * 60 * 1000;

function useClimaAtual() {
  const [clima, setClima] = useState<ClimaAtual | null>(null);
  useEffect(() => {
    try {
      const cache = JSON.parse(localStorage.getItem(CHAVE_CACHE_CLIMA) || "null");
      if (cache && Date.now() - cache.salvoEm < VALIDADE_CACHE_CLIMA_MS) {
        setClima(cache.clima);
        return;
      }
    } catch {
      // cache invalido, ignora e busca de novo
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${FAZENDA_LAT}&longitude=${FAZENDA_LON}&current=temperature_2m,relative_humidity_2m&timezone=auto`;
    fetch(url)
      .then((r) => r.json())
      .then((dados) => {
        const novoClima = {
          temperatura: dados.current.temperature_2m,
          umidade: dados.current.relative_humidity_2m,
        };
        setClima(novoClima);
        try {
          localStorage.setItem(
            CHAVE_CACHE_CLIMA,
            JSON.stringify({ clima: novoClima, salvoEm: Date.now() })
          );
        } catch {
          // sem espaco no localStorage, sem problema, so nao guarda o cache
        }
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

function ChecklistPrimeiroUso({
  semSetores,
  semFuncionarios,
}: {
  semSetores: boolean;
  semFuncionarios: boolean;
}) {
  if (!semSetores && !semFuncionarios) return null;
  return (
    <div className="card border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20">
      <h3 className="mb-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
        Vamos começar
      </h3>
      <p className="mb-3 text-xs text-neutral-500">
        Cadastre os setores e a equipe da fazenda para aproveitar o app.
      </p>
      <div className="flex gap-2">
        {semSetores && (
          <a
            href="/setores"
            className="flex-1 rounded-xl bg-brand-600 py-2 text-center text-xs font-semibold text-white dark:bg-brand-500"
          >
            Cadastrar setores
          </a>
        )}
        {semFuncionarios && (
          <a
            href="/funcionarios"
            className="flex-1 rounded-xl bg-brand-600 py-2 text-center text-xs font-semibold text-white dark:bg-brand-500"
          >
            Cadastrar equipe
          </a>
        )}
      </div>
    </div>
  );
}

function PaginaAdmin() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [temFuncionarios, setTemFuncionarios] = useState(true);
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

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((lista) => setTemFuncionarios(Array.isArray(lista) && lista.length > 0))
      .catch(() => {});
  }, []);

  return (
    <>
      <CabecalhoLogo />
      <div className="space-y-4 p-4">
        {!carregando && resumo && (
          <ChecklistPrimeiroUso
            semSetores={resumo.porSetor.length === 0}
            semFuncionarios={!temFuncionarios}
          />
        )}

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

        <AvisoDocumentosVencendo />

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

        <ResumoMetas />

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

  const itens = [
    { href: "/ponto", label: "Ponto", icon: "\u{1F550}" },
    { href: "/manejo", label: "Manejo", icon: "\u{1F4C5}" },
    { href: "/ferramentas", label: "Ferramentas", icon: "\u{1F527}" },
    { href: "/galeria", label: "Galeria", icon: "\u{1F4F7}" },
    { href: "/mural", label: "Mural", icon: "\u{1F4CC}" },
  ];

  return (
    <>
      <div className="relative">
        <CabecalhoLogo mostrarConfig />
      </div>
      <div className="space-y-4 p-4">
        <AvisoAtividadesHoje />

        <a
          href="/mentor"
          className="block w-full rounded-2xl bg-brand-600 py-5 text-center text-lg font-bold text-white shadow-md active:opacity-80"
        >
          {"\u{1F9D1}\u200D\u{1F33E}"} Mentor Rural
        </a>

        <div className="grid grid-cols-3 gap-2">
          <CartaoClima clima={clima} />
          {itens.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-neutral-900"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </a>
          ))}
        </div>

        <a
          href="/emergencia"
          className="block w-full rounded-2xl bg-danger py-4 text-center text-base font-bold text-white active:opacity-80"
        >
          {"\u{1F6A8}"} Emergencia
        </a>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const usuario = useAuth();
  if (usuario?.tipo === "chefe") return <PaginaAdmin />;
  return <PaginaCampo />;
}
