"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";

const FATORES_PESO: Record<string, number> = {
  kg: 1,
  saca_cafe: 60,
  arroba: 15,
  tonelada: 1000,
  g: 0.001,
};
const ROTULOS_PESO: Record<string, string> = {
  kg: "Quilogramas (kg)",
  saca_cafe: "Sacas de cafe (60kg)",
  arroba: "Arrobas (15kg)",
  tonelada: "Toneladas",
  g: "Gramas",
};

const FATORES_VOLUME: Record<string, number> = {
  litro: 1,
  ml: 0.001,
  galao: 3.785,
  m3: 1000,
};
const ROTULOS_VOLUME: Record<string, string> = {
  litro: "Litros",
  ml: "Mililitros",
  galao: "Galoes (US)",
  m3: "Metros cubicos",
};

const FATORES_AREA: Record<string, number> = {
  hectare: 1,
  m2: 0.0001,
  alqueire_paulista: 2.42,
  alqueire_mineiro: 4.84,
};
const ROTULOS_AREA: Record<string, string> = {
  hectare: "Hectares",
  m2: "Metros quadrados",
  alqueire_paulista: "Alqueire paulista",
  alqueire_mineiro: "Alqueire mineiro/goiano",
};

function formatarNumero(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

export default function FerramentasPage() {
  const [aba, setAba] = useState<"conversor" | "dosagem">("conversor");

  const [tipoConversor, setTipoConversor] = useState<"peso" | "volume" | "area">("peso");
  const [valorEntrada, setValorEntrada] = useState("");
  const [unidadeDe, setUnidadeDe] = useState("kg");
  const [unidadeParaSel, setUnidadeParaSel] = useState("saca_cafe");

  const [areaHa, setAreaHa] = useState("");
  const [doseHa, setDoseHa] = useState("");
  const [capacidadeTanque, setCapacidadeTanque] = useState("");

  const fatores = tipoConversor === "peso" ? FATORES_PESO : tipoConversor === "volume" ? FATORES_VOLUME : FATORES_AREA;
  const rotulos = tipoConversor === "peso" ? ROTULOS_PESO : tipoConversor === "volume" ? ROTULOS_VOLUME : ROTULOS_AREA;

  const valorNum = Number(valorEntrada.replace(",", ".")) || 0;
  const resultado = (valorNum * fatores[unidadeDe]) / fatores[unidadeParaSel];

  const areaNum = Number(areaHa.replace(",", ".")) || 0;
  const doseNum = Number(doseHa.replace(",", ".")) || 0;
  const capacidadeNum = Number(capacidadeTanque.replace(",", ".")) || 0;
  const totalProduto = areaNum * doseNum;
  const numTanques = capacidadeNum > 0 ? totalProduto / capacidadeNum : 0;

  return (
    <>
      <Header titulo="Ferramentas" subtitulo="Conversor e calculadora de dosagem" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setAba("conversor")}
            className={`rounded-xl border py-2 text-sm font-medium ${
              aba === "conversor"
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
            }`}
          >
            Conversor
          </button>
          <button
            onClick={() => setAba("dosagem")}
            className={`rounded-xl border py-2 text-sm font-medium ${
              aba === "dosagem"
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
            }`}
          >
            Dosagem
          </button>
        </div>

        {aba === "conversor" && (
          <div className="card space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(["peso", "volume", "area"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTipoConversor(t);
                    const chaves = Object.keys(t === "peso" ? FATORES_PESO : t === "volume" ? FATORES_VOLUME : FATORES_AREA);
                    setUnidadeDe(chaves[0]);
                    setUnidadeParaSel(chaves[1]);
                  }}
                  className={`rounded-xl border py-2 text-xs font-medium capitalize ${
                    tipoConversor === t
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                      : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              className="input-field"
              inputMode="decimal"
              placeholder="Valor"
              value={valorEntrada}
              onChange={(e) => setValorEntrada(e.target.value)}
            />

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">De</label>
              <select className="input-field" value={unidadeDe} onChange={(e) => setUnidadeDe(e.target.value)}>
                {Object.keys(fatores).map((u) => (
                  <option key={u} value={u}>
                    {rotulos[u]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Para</label>
              <select className="input-field" value={unidadeParaSel} onChange={(e) => setUnidadeParaSel(e.target.value)}>
                {Object.keys(fatores).map((u) => (
                  <option key={u} value={u}>
                    {rotulos[u]}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-brand-50 p-4 text-center dark:bg-brand-900/20">
              <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                {formatarNumero(resultado)}
              </p>
              <p className="text-xs text-neutral-500">{rotulos[unidadeParaSel]}</p>
            </div>
          </div>
        )}

        {aba === "dosagem" && (
          <div className="card space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Area a tratar (hectares)</label>
              <input
                className="input-field"
                inputMode="decimal"
                value={areaHa}
                onChange={(e) => setAreaHa(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Dose recomendada (L ou kg por hectare)</label>
              <input
                className="input-field"
                inputMode="decimal"
                value={doseHa}
                onChange={(e) => setDoseHa(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Capacidade do pulverizador/tanque (litros, opcional)</label>
              <input
                className="input-field"
                inputMode="decimal"
                value={capacidadeTanque}
                onChange={(e) => setCapacidadeTanque(e.target.value)}
              />
            </div>

            <div className="rounded-2xl bg-brand-50 p-4 text-center dark:bg-brand-900/20">
              <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                {formatarNumero(totalProduto)}
              </p>
              <p className="text-xs text-neutral-500">Total de produto necessario</p>
              {capacidadeNum > 0 && (
                <p className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {formatarNumero(numTanques)} tanques cheios
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
