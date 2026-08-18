"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";

interface AnimalResumo {
  id: number;
  setor_id: number;
  setor_nome: string;
  setor_cor: string;
  talhao_id: number | null;
  talhao_nome: string | null;
  identificacao: string;
  nome: string | null;
  especie: string;
  sexo: string;
  data_nascimento: string | null;
  status: string;
  foto_url: string | null;
  peso_atual: number | null;
}

interface Setor {
  id: number;
  nome: string;
  tipo: string;
  cor: string;
}

interface Talhao {
  id: number;
  nome: string;
}

const ESPECIES: { valor: string; rotulo: string }[] = [
  { valor: "bovino", rotulo: "Bovino" },
  { valor: "ovino", rotulo: "Ovino" },
  { valor: "outro", rotulo: "Outro" },
];

const ESPECIE_POR_TIPO_SETOR: Record<string, string> = { gado: "bovino", ovelhas: "ovino" };

function calcularIdade(dataNascimento: string | null) {
  if (!dataNascimento) return null;
  const nascimento = new Date(dataNascimento + "T12:00:00");
  const hoje = new Date();
  let meses = (hoje.getFullYear() - nascimento.getFullYear()) * 12 + (hoje.getMonth() - nascimento.getMonth());
  if (hoje.getDate() < nascimento.getDate()) meses -= 1;
  if (meses < 0) return null;
  if (meses < 1) return "recem-nascido";
  if (meses < 24) return `${meses} ${meses === 1 ? "mes" : "meses"}`;
  const anos = Math.floor(meses / 12);
  return `${anos} ${anos === 1 ? "ano" : "anos"}`;
}

const FILTROS_STATUS = [
  { valor: "ativo", rotulo: "Ativos" },
  { valor: "vendido", rotulo: "Vendidos" },
  { valor: "morto", rotulo: "Mortos" },
];

export default function AnimaisPage() {
  const [animais, setAnimais] = useState<AnimalResumo[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState("ativo");
  const [busca, setBusca] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [setorId, setSetorId] = useState<number | "">("");
  const [talhaoId, setTalhaoId] = useState<number | "">("");
  const [identificacao, setIdentificacao] = useState("");
  const [nomeAnimal, setNomeAnimal] = useState("");
  const [especie, setEspecie] = useState("bovino");
  const [sexo, setSexo] = useState<"macho" | "femea">("femea");
  const [dataNascimento, setDataNascimento] = useState("");
  const [raca, setRaca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function carregar(status: string) {
    setCarregando(true);
    fetch(`/api/animais?status=${status}`)
      .then((r) => r.json())
      .then(setAnimais)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- precisa mostrar loading a cada troca de filtro de status
    carregar(statusFiltro);
  }, [statusFiltro]);

  useEffect(() => {
    fetch("/api/sectors").then((r) => r.json()).then(setSetores);
  }, []);

  useEffect(() => {
    if (!setorId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- precisa limpar talhao/lista a cada troca/zerada de setor
      setTalhoes([]);
      setTalhaoId("");
      return;
    }
    const setor = setores.find((s) => s.id === setorId);
    if (setor && ESPECIE_POR_TIPO_SETOR[setor.tipo]) {
      setEspecie(ESPECIE_POR_TIPO_SETOR[setor.tipo]);
    }
    fetch(`/api/talhoes?setor_id=${setorId}`)
      .then((r) => r.json())
      .then(setTalhoes);
  }, [setorId, setores]);

  function abrirNovo() {
    setSetorId(setores[0]?.id ?? "");
    setTalhaoId("");
    setIdentificacao("");
    setNomeAnimal("");
    setEspecie("bovino");
    setSexo("femea");
    setDataNascimento("");
    setRaca("");
    setErro("");
    setModalAberto(true);
  }

  async function salvar() {
    if (!setorId || !identificacao.trim()) {
      setErro("Escolha um setor e digite a identificacao (brinco/numero).");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/animais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setor_id: setorId,
          talhao_id: talhaoId || null,
          identificacao: identificacao.trim(),
          nome: nomeAnimal.trim() || null,
          especie,
          sexo,
          data_nascimento: dataNascimento || null,
          raca: raca.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErro(data.error ?? "Erro ao salvar animal.");
        return;
      }
      setModalAberto(false);
      carregar(statusFiltro);
    } finally {
      setSalvando(false);
    }
  }

  const animaisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return animais;
    return animais.filter(
      (a) =>
        a.identificacao.toLowerCase().includes(termo) ||
        (a.nome ?? "").toLowerCase().includes(termo)
    );
  }, [animais, busca]);

  const grupos = useMemo(() => {
    const mapa = new Map<number, { setor: { nome: string; cor: string }; itens: AnimalResumo[] }>();
    for (const a of animaisFiltrados) {
      if (!mapa.has(a.setor_id)) {
        mapa.set(a.setor_id, { setor: { nome: a.setor_nome, cor: a.setor_cor }, itens: [] });
      }
      mapa.get(a.setor_id)!.itens.push(a);
    }
    return Array.from(mapa.values());
  }, [animaisFiltrados]);

  return (
    <>
      <Header titulo="Animais" subtitulo="Ficha individual do rebanho" />
      <div className="space-y-4 p-4 pb-24">
        <div className="card border-neutral-200 bg-neutral-50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50">
          <p className="mb-1 font-semibold text-neutral-600 dark:text-neutral-300">
            Calendário sanitário obrigatório (referência nacional)
          </p>
          <p>
            Aftosa: normalmente maio e novembro. Brucelose: fêmeas de 3 a 8 meses. As datas exatas variam por
            estado — confirme com a Adab/IDF local. Cadastre a &quot;próxima dose&quot; na vacina do animal para receber
            aviso automático aqui no app.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {FILTROS_STATUS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setStatusFiltro(f.valor)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                statusFiltro === f.valor
                  ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        <input
          className="input-field"
          placeholder="Buscar por identificacao ou nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {carregando ? (
          <div className="card animate-pulse text-center text-sm text-neutral-400">Carregando animais...</div>
        ) : grupos.length === 0 ? (
          <div className="card text-center">
            <p className="text-sm text-neutral-500">Nenhum animal cadastrado com esse filtro ainda.</p>
            <button className="btn-primary mt-4 w-full" onClick={abrirNovo}>
              + Novo animal
            </button>
          </div>
        ) : (
          grupos.map(({ setor, itens }) => (
            <div key={setor.nome}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: setor.cor }} />
                <h2 className="text-sm font-semibold">{setor.nome}</h2>
                <span className="text-xs text-neutral-400">{itens.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {itens.map((a) => {
                  const idade = calcularIdade(a.data_nascimento);
                  return (
                    <Link key={a.id} href={`/animais/${a.id}`} className="card block">
                      <div className="mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                        {a.foto_url ? (
                          <img src={a.foto_url} alt={a.identificacao} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-3xl">{a.sexo === "macho" ? "🐂" : "🐄"}</span>
                        )}
                      </div>
                      <p className="truncate text-sm font-semibold">{a.nome || a.identificacao}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {a.nome ? a.identificacao : idade ?? "Idade nao informada"}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
                        <span>{a.peso_atual != null ? `${a.peso_atual} kg` : "sem peso"}</span>
                        {a.talhao_nome && <span className="truncate">{a.talhao_nome}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {grupos.length > 0 && (
          <button className="btn-primary w-full" onClick={abrirNovo}>
            + Novo animal
          </button>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo animal</h2>
              <button
                onClick={() => setModalAberto(false)}
                className="text-2xl leading-none text-neutral-400"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Setor</label>
                <select
                  className="input-field"
                  value={setorId}
                  onChange={(e) => setSetorId(Number(e.target.value))}
                >
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              {talhoes.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Talhão / piquete (opcional)</label>
                  <select
                    className="input-field"
                    value={talhaoId}
                    onChange={(e) => setTalhaoId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Nao informado</option>
                    {talhoes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Identificação (brinco)</label>
                  <input
                    className="input-field"
                    placeholder="Ex: 042"
                    value={identificacao}
                    onChange={(e) => setIdentificacao(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Nome (opcional)</label>
                  <input
                    className="input-field"
                    placeholder="Ex: Mimosa"
                    value={nomeAnimal}
                    onChange={(e) => setNomeAnimal(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Espécie</label>
                <div className="grid grid-cols-3 gap-2">
                  {ESPECIES.map((e) => (
                    <button
                      key={e.valor}
                      onClick={() => setEspecie(e.valor)}
                      className={`rounded-xl border py-2 text-sm font-medium transition ${
                        especie === e.valor
                          ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                      }`}
                    >
                      {e.rotulo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Sexo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSexo("femea")}
                    className={`rounded-xl border py-2 text-sm font-medium transition ${
                      sexo === "femea"
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                        : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                    }`}
                  >
                    Fêmea
                  </button>
                  <button
                    onClick={() => setSexo("macho")}
                    className={`rounded-xl border py-2 text-sm font-medium transition ${
                      sexo === "macho"
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                        : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                    }`}
                  >
                    Macho
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Nascimento (opcional)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Raça (opcional)</label>
                  <input
                    className="input-field"
                    placeholder="Ex: Nelore"
                    value={raca}
                    onChange={(e) => setRaca(e.target.value)}
                  />
                </div>
              </div>

              {erro && <p className="text-sm text-danger">{erro}</p>}

              <button className="btn-primary w-full" disabled={salvando} onClick={salvar}>
                {salvando ? "Salvando..." : "Salvar animal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
