"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";

interface Pesagem {
  id: number;
  peso_kg: number;
  data: string;
  observacao: string | null;
}

interface Vacina {
  id: number;
  produto: string;
  data_aplicacao: string;
  proxima_dose: string | null;
  observacao: string | null;
}

interface Reproducao {
  id: number;
  tipo: string;
  data: string;
  parceiro: string | null;
  observacao: string | null;
}

interface AnimalDetalhe {
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
  raca: string | null;
  status: string;
  foto_url: string | null;
  observacao: string | null;
  pesagens: Pesagem[];
  vacinas: Vacina[];
  reproducao: Reproducao[];
}

const TIPO_REPRODUCAO_LABEL: Record<string, string> = {
  cobertura: "Cobertura",
  prenhez_confirmada: "Prenhez confirmada",
  parto: "Parto",
  desmame: "Desmame",
};

const STATUS_LABEL: Record<string, string> = { ativo: "Ativo", vendido: "Vendido", morto: "Morto" };
const STATUS_STYLE: Record<string, string> = {
  ativo: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  vendido: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  morto: "bg-danger/10 text-danger",
};

function formatarData(data: string) {
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
}

function calcularIdade(dataNascimento: string | null) {
  if (!dataNascimento) return "Idade nao informada";
  const nascimento = new Date(dataNascimento + "T12:00:00");
  const hoje = new Date();
  let meses = (hoje.getFullYear() - nascimento.getFullYear()) * 12 + (hoje.getMonth() - nascimento.getMonth());
  if (hoje.getDate() < nascimento.getDate()) meses -= 1;
  if (meses < 1) return "recem-nascido";
  if (meses < 24) return `${meses} ${meses === 1 ? "mes" : "meses"}`;
  const anos = Math.floor(meses / 12);
  return `${anos} ${anos === 1 ? "ano" : "anos"}`;
}

function vacinaSituacao(proximaDose: string | null) {
  if (!proximaDose) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  if (proximaDose < hoje) return { rotulo: "Atrasada", estilo: "text-danger" };
  const emDias = (new Date(proximaDose + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000;
  if (emDias <= 14) return { rotulo: "Em breve", estilo: "text-warning" };
  return { rotulo: `Proxima: ${formatarData(proximaDose)}`, estilo: "text-neutral-400" };
}

export default function FichaAnimalPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [animal, setAnimal] = useState<AnimalDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const [modal, setModal] = useState<"peso" | "vacina" | "reproducao" | "editar" | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [pesoKg, setPesoKg] = useState("");
  const [pesoData, setPesoData] = useState(() => new Date().toISOString().slice(0, 10));
  const [pesoObs, setPesoObs] = useState("");

  const [vacinaProduto, setVacinaProduto] = useState("");
  const [vacinaData, setVacinaData] = useState(() => new Date().toISOString().slice(0, 10));
  const [vacinaProxima, setVacinaProxima] = useState("");
  const [vacinaObs, setVacinaObs] = useState("");

  const [reproTipo, setReproTipo] = useState("cobertura");
  const [reproData, setReproData] = useState(() => new Date().toISOString().slice(0, 10));
  const [reproParceiro, setReproParceiro] = useState("");
  const [reproObs, setReproObs] = useState("");

  const [editNome, setEditNome] = useState("");
  const [editRaca, setEditRaca] = useState("");
  const [editNascimento, setEditNascimento] = useState("");
  const [editObs, setEditObs] = useState("");

  const carregar = useCallback(() => {
    setCarregando(true);
    fetch(`/api/animais/${id}`)
      .then((r) => r.json())
      .then(setAnimal)
      .finally(() => setCarregando(false));
  }, [id]);

  useEffect(() => {
    if (id) carregar();
  }, [id, carregar]);

  function abrirEditar() {
    if (!animal) return;
    setEditNome(animal.nome ?? "");
    setEditRaca(animal.raca ?? "");
    setEditNascimento(animal.data_nascimento ?? "");
    setEditObs(animal.observacao ?? "");
    setErro("");
    setModal("editar");
  }

  async function salvarEdicao() {
    setSalvando(true);
    setErro("");
    try {
      await fetch(`/api/animais/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editNome.trim() || null,
          raca: editRaca.trim() || null,
          data_nascimento: editNascimento || null,
          observacao: editObs.trim() || null,
        }),
      });
      setModal(null);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(status: string) {
    const confirmacoes: Record<string, string> = {
      vendido: "Marcar este animal como vendido?",
      morto: "Registrar a morte deste animal?",
      ativo: "Reativar este animal?",
    };
    if (!window.confirm(confirmacoes[status])) return;
    await fetch(`/api/animais/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    carregar();
  }

  async function excluirAnimal() {
    if (!window.confirm("Excluir este animal e todo o historico dele? Essa acao nao pode ser desfeita.")) return;
    await fetch(`/api/animais/${id}`, { method: "DELETE" });
    router.push("/animais");
  }

  async function enviarFoto(arquivo: File) {
    setEnviandoFoto(true);
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("animal_id", id);
    try {
      await fetch("/api/animais/upload", { method: "POST", body: formData });
      carregar();
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function salvarPeso() {
    if (!pesoKg || !pesoData) {
      setErro("Informe o peso e a data.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await fetch(`/api/animais/${id}/pesagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peso_kg: Number(pesoKg.replace(",", ".")), data: pesoData, observacao: pesoObs.trim() || null }),
      });
      setPesoKg("");
      setPesoObs("");
      setModal(null);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarVacina() {
    if (!vacinaProduto.trim() || !vacinaData) {
      setErro("Informe o produto e a data de aplicacao.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await fetch(`/api/animais/${id}/vacinas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto: vacinaProduto.trim(),
          data_aplicacao: vacinaData,
          proxima_dose: vacinaProxima || null,
          observacao: vacinaObs.trim() || null,
        }),
      });
      setVacinaProduto("");
      setVacinaProxima("");
      setVacinaObs("");
      setModal(null);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarReproducao() {
    if (!reproData) {
      setErro("Informe a data do evento.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await fetch(`/api/animais/${id}/reproducao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: reproTipo,
          data: reproData,
          parceiro: reproParceiro.trim() || null,
          observacao: reproObs.trim() || null,
        }),
      });
      setReproParceiro("");
      setReproObs("");
      setModal(null);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  if (carregando || !animal) {
    return (
      <>
        <Header titulo="Animal" />
        <div className="p-4">
          <div className="card animate-pulse text-center text-sm text-neutral-400">Carregando...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header titulo={animal.nome || animal.identificacao} subtitulo={animal.setor_nome} />
      <div className="space-y-4 p-4 pb-24">
        <div className="card">
          <div className="flex gap-3">
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
              {animal.foto_url ? (
                <img src={animal.foto_url} alt={animal.identificacao} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">
                  {animal.sexo === "macho" ? "🐂" : "🐄"}
                </div>
              )}
              <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-xs text-white">
                📷
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={enviandoFoto}
                  className="hidden"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) enviarFoto(arquivo);
                  }}
                />
              </label>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold">{animal.nome || animal.identificacao}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[animal.status]}`}>
                  {STATUS_LABEL[animal.status]}
                </span>
              </div>
              {animal.nome && <p className="text-xs text-neutral-500">Identificação: {animal.identificacao}</p>}
              <p className="text-xs text-neutral-500">{calcularIdade(animal.data_nascimento)}</p>
              {animal.raca && <p className="text-xs text-neutral-500">Raça: {animal.raca}</p>}
              {animal.talhao_nome && <p className="text-xs text-neutral-500">Talhão: {animal.talhao_nome}</p>}
              <p className="mt-1 text-xs font-medium text-neutral-400">
                {animal.sexo === "macho" ? "Macho" : "Fêmea"}
                {animal.pesagens[0] ? ` · ${animal.pesagens[0].peso_kg} kg` : ""}
              </p>
            </div>
          </div>
          {animal.observacao && <p className="mt-3 text-xs text-neutral-500">{animal.observacao}</p>}
          <button onClick={abrirEditar} className="mt-3 w-full rounded-xl border border-neutral-300 py-2 text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
            Editar dados
          </button>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Peso</h2>
            <button onClick={() => setModal("peso")} className="text-xs font-medium text-brand-600 dark:text-brand-400">
              + Registrar
            </button>
          </div>
          {animal.pesagens.length === 0 ? (
            <p className="text-xs text-neutral-400">Nenhuma pesagem registrada.</p>
          ) : (
            <div className="space-y-2">
              {animal.pesagens.map((p, i) => {
                const anterior = animal.pesagens[i + 1];
                const delta = anterior ? p.peso_kg - anterior.peso_kg : null;
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">{formatarData(p.data)}</span>
                    <span className="font-medium">
                      {p.peso_kg} kg
                      {delta != null && (
                        <span className={delta >= 0 ? "text-brand-600 dark:text-brand-400" : "text-danger"}>
                          {" "}
                          ({delta >= 0 ? "+" : ""}
                          {delta.toFixed(1)})
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Vacinas</h2>
            <button onClick={() => setModal("vacina")} className="text-xs font-medium text-brand-600 dark:text-brand-400">
              + Registrar
            </button>
          </div>
          {animal.vacinas.length === 0 ? (
            <p className="text-xs text-neutral-400">Nenhuma vacina registrada.</p>
          ) : (
            <div className="space-y-2">
              {animal.vacinas.map((v) => {
                const situacao = vacinaSituacao(v.proxima_dose);
                return (
                  <div key={v.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{v.produto}</span>
                      <span className="text-neutral-500">{formatarData(v.data_aplicacao)}</span>
                    </div>
                    {situacao && <p className={`text-xs ${situacao.estilo}`}>{situacao.rotulo}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Reprodução</h2>
            <button onClick={() => setModal("reproducao")} className="text-xs font-medium text-brand-600 dark:text-brand-400">
              + Registrar
            </button>
          </div>
          {animal.reproducao.length === 0 ? (
            <p className="text-xs text-neutral-400">Nenhum evento reprodutivo registrado.</p>
          ) : (
            <div className="space-y-2">
              {animal.reproducao.map((r) => (
                <div key={r.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{TIPO_REPRODUCAO_LABEL[r.tipo]}</span>
                    <span className="text-neutral-500">{formatarData(r.data)}</span>
                  </div>
                  {r.parceiro && <p className="text-xs text-neutral-400">Reprodutor: {r.parceiro}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-2">
          <h2 className="mb-1 text-sm font-semibold">Status do animal</h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              disabled={animal.status === "ativo"}
              onClick={() => mudarStatus("ativo")}
              className="rounded-xl border border-brand-600 py-2 text-xs font-medium text-brand-600 disabled:opacity-30 dark:text-brand-400"
            >
              Ativo
            </button>
            <button
              disabled={animal.status === "vendido"}
              onClick={() => mudarStatus("vendido")}
              className="rounded-xl border border-neutral-400 py-2 text-xs font-medium text-neutral-600 disabled:opacity-30 dark:text-neutral-300"
            >
              Vendido
            </button>
            <button
              disabled={animal.status === "morto"}
              onClick={() => mudarStatus("morto")}
              className="rounded-xl border border-danger py-2 text-xs font-medium text-danger disabled:opacity-30"
            >
              Morto
            </button>
          </div>
          <button onClick={excluirAnimal} className="w-full pt-2 text-center text-xs font-medium text-danger">
            Excluir animal e historico
          </button>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {modal === "peso" && "Registrar peso"}
                {modal === "vacina" && "Registrar vacina"}
                {modal === "reproducao" && "Registrar evento reprodutivo"}
                {modal === "editar" && "Editar dados"}
              </h2>
              <button onClick={() => setModal(null)} className="text-2xl leading-none text-neutral-400" aria-label="Fechar">
                ×
              </button>
            </div>

            {modal === "peso" && (
              <div className="space-y-3">
                <input className="input-field" inputMode="decimal" placeholder="Peso (kg)" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} />
                <input type="date" className="input-field" value={pesoData} onChange={(e) => setPesoData(e.target.value)} />
                <input className="input-field" placeholder="Observação (opcional)" value={pesoObs} onChange={(e) => setPesoObs(e.target.value)} />
                {erro && <p className="text-sm text-danger">{erro}</p>}
                <button className="btn-primary w-full" disabled={salvando} onClick={salvarPeso}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            )}

            {modal === "vacina" && (
              <div className="space-y-3">
                <input className="input-field" placeholder="Produto (ex: Aftosa)" value={vacinaProduto} onChange={(e) => setVacinaProduto(e.target.value)} />
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Data de aplicação</label>
                  <input type="date" className="input-field" value={vacinaData} onChange={(e) => setVacinaData(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Próxima dose (opcional)</label>
                  <input type="date" className="input-field" value={vacinaProxima} onChange={(e) => setVacinaProxima(e.target.value)} />
                </div>
                <input className="input-field" placeholder="Observação (opcional)" value={vacinaObs} onChange={(e) => setVacinaObs(e.target.value)} />
                {erro && <p className="text-sm text-danger">{erro}</p>}
                <button className="btn-primary w-full" disabled={salvando} onClick={salvarVacina}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            )}

            {modal === "reproducao" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TIPO_REPRODUCAO_LABEL).map(([valor, rotulo]) => (
                    <button
                      key={valor}
                      onClick={() => setReproTipo(valor)}
                      className={`rounded-xl border py-2 text-xs font-medium transition ${
                        reproTipo === valor
                          ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                      }`}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
                <input type="date" className="input-field" value={reproData} onChange={(e) => setReproData(e.target.value)} />
                <input className="input-field" placeholder="Reprodutor / parceiro (opcional)" value={reproParceiro} onChange={(e) => setReproParceiro(e.target.value)} />
                <input className="input-field" placeholder="Observação (opcional)" value={reproObs} onChange={(e) => setReproObs(e.target.value)} />
                {erro && <p className="text-sm text-danger">{erro}</p>}
                <button className="btn-primary w-full" disabled={salvando} onClick={salvarReproducao}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            )}

            {modal === "editar" && (
              <div className="space-y-3">
                <input className="input-field" placeholder="Nome (opcional)" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                <input className="input-field" placeholder="Raça (opcional)" value={editRaca} onChange={(e) => setEditRaca(e.target.value)} />
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Nascimento (opcional)</label>
                  <input type="date" className="input-field" value={editNascimento} onChange={(e) => setEditNascimento(e.target.value)} />
                </div>
                <textarea className="input-field" rows={2} placeholder="Observação (opcional)" value={editObs} onChange={(e) => setEditObs(e.target.value)} />
                <button className="btn-primary w-full" disabled={salvando} onClick={salvarEdicao}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
