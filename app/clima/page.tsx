"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";

const FAZENDA_LAT = -15.7639781;
const FAZENDA_LON = -39.4699029;

interface Previsao {
  data: string;
  tempMax: number;
  tempMin: number;
  chuvaProb: number;
  umidade: number;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function formatarDia(dataStr: string) {
  const data = new Date(dataStr + "T12:00:00");
  return DIAS_SEMANA[data.getDay()] + " " + data.getDate() + "/" + (data.getMonth() + 1);
}

export default function ClimaPage() {
  const [previsoes, setPrevisoes] = useState<Previsao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${FAZENDA_LAT}&longitude=${FAZENDA_LON}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_mean&timezone=auto&forecast_days=7`;
    fetch(url)
      .then((r) => r.json())
      .then((dados) => {
        const dias = dados.daily.time as string[];
        const lista: Previsao[] = dias.map((dia: string, i: number) => ({
          data: dia,
          tempMax: dados.daily.temperature_2m_max[i],
          tempMin: dados.daily.temperature_2m_min[i],
          chuvaProb: dados.daily.precipitation_probability_max[i],
          umidade: dados.daily.relative_humidity_2m_mean[i],
        }));
        setPrevisoes(lista);
      })
      .catch(() => setErro("Nao foi possivel carregar a previsao do tempo."))
      .finally(() => setCarregando(false));
  }, []);

  const alertaGeada = previsoes.length > 0 && previsoes[0].tempMin <= 3;
  const alertaChuvaHoje = previsoes.length > 0 && previsoes[0].chuvaProb >= 60;

  return (
    <>
      <Header titulo="Clima" subtitulo="Previsao para os proximos 7 dias" />
      <div className="space-y-3 p-4">
        {carregando && <div className="card text-center text-sm text-neutral-400">Carregando previsao...</div>}
        {erro && <div className="card text-center text-sm text-danger">{erro}</div>}

        {alertaGeada && (
          <div className="card border-danger bg-red-50 dark:bg-red-900/20">
            <p className="text-sm font-semibold text-danger">Risco de geada</p>
            <p className="text-xs text-neutral-500">
              Temperatura minima prevista para hoje esta baixa. Fique atento, especialmente para o cafeeiro.
            </p>
          </div>
        )}
        {alertaChuvaHoje && (
          <div className="card border-warning bg-warning/5">
            <p className="text-sm font-semibold text-warning">Alta chance de chuva hoje</p>
            <p className="text-xs text-neutral-500">
              Evite pulverizar defensivos hoje - o produto pode ser lavado antes de agir.
            </p>
          </div>
        )}

        {previsoes.map((p, i) => (
          <div key={p.data} className="card flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{i === 0 ? "Hoje" : formatarDia(p.data)}</p>
              <p className="text-xs text-neutral-500">Umidade {Math.round(p.umidade)}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">
                {Math.round(p.tempMax)}C / {Math.round(p.tempMin)}C
              </p>
              <p className="text-xs text-neutral-500">Chuva {Math.round(p.chuvaProb)}%</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
