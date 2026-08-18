"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Header from "@/components/layout/Header";
import { useToast } from "@/components/ui/ToastContext";

const FAZENDA_LAT = -15.7639781;
const FAZENDA_LON = -39.4699029;

interface Previsao {
  data: string;
  tempMax: number;
  tempMin: number;
  chuvaProb: number;
  umidade: number;
}

interface RegistroChuva {
  id: number;
  data: string;
  mm: number;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function formatarDia(dataStr: string) {
  const data = new Date(dataStr + "T12:00:00");
  return DIAS_SEMANA[data.getDay()] + " " + data.getDate() + "/" + (data.getMonth() + 1);
}

function formatarDiaCurto(dataStr: string) {
  const data = new Date(dataStr + "T12:00:00");
  return `${data.getDate()}/${data.getMonth() + 1}`;
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarNumero(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export default function ClimaPage() {
  const toast = useToast();
  const [previsoes, setPrevisoes] = useState<Previsao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [registrosChuva, setRegistrosChuva] = useState<RegistroChuva[]>([]);
  const [mmHoje, setMmHoje] = useState("");
  const [salvandoChuva, setSalvandoChuva] = useState(false);

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

  function carregarChuva() {
    fetch("/api/chuva")
      .then((r) => r.json())
      .then(setRegistrosChuva)
      .catch(() => toast.erro("Nao foi possivel carregar o historico de chuva."));
  }

  useEffect(() => {
    carregarChuva();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvarChuvaHoje() {
    if (!mmHoje) return;
    setSalvandoChuva(true);
    try {
      const res = await fetch("/api/chuva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: hojeISO(), mm: Number(mmHoje.replace(",", ".")) }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => ({}));
        toast.erro(dados.error ?? "Nao foi possivel salvar a chuva registrada.");
        return;
      }
      setMmHoje("");
      carregarChuva();
      toast.sucesso("Chuva de hoje registrada.");
    } catch {
      toast.erro("Nao foi possivel salvar. Verifique sua conexao.");
    } finally {
      setSalvandoChuva(false);
    }
  }

  const dadosGraficoChuva = registrosChuva.map((r) => ({
    dia: formatarDiaCurto(r.data),
    mm: r.mm,
  }));
  const [agora] = useState(() => Date.now());
  const totalUltimos30Dias = registrosChuva
    .filter((r) => r.data >= new Date(agora - 30 * 86400000).toISOString().slice(0, 10))
    .reduce((soma, r) => soma + r.mm, 0);

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

        <div className="card">
          <h2 className="mb-1 text-sm font-semibold">Pluviômetro da fazenda</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Registre a chuva medida de verdade na propriedade — mais confiável que a previsão pra decisão de plantio
            e colheita.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              className="input-field"
              placeholder="mm de chuva hoje"
              value={mmHoje}
              onChange={(e) => setMmHoje(e.target.value)}
            />
            <button
              className="btn-primary flex-shrink-0 !px-4"
              disabled={salvandoChuva || !mmHoje}
              onClick={salvarChuvaHoje}
            >
              {salvandoChuva ? "..." : "Salvar"}
            </button>
          </div>

          {registrosChuva.length > 0 && (
            <>
              <p className="mt-4 text-xs text-neutral-500">
                Total nos últimos 30 dias: <span className="font-semibold">{formatarNumero(totalUltimos30Dias)} mm</span>
              </p>
              <div className="mt-2 h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoChuva}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} width={30} />
                    <Tooltip formatter={(v: number) => `${v} mm`} />
                    <Bar dataKey="mm" radius={[4, 4, 0, 0]} fill="#3f8f34" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
