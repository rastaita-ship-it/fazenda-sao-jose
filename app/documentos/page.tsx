"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { useToast } from "@/components/ui/ToastContext";

interface Documento {
  id: number;
  tipo: string;
  titulo: string;
  patrimonio_id: number | null;
  patrimonio_nome: string | null;
  funcionario_id: number | null;
  funcionario_nome: string | null;
  numero_documento: string | null;
  data_emissao: string | null;
  data_vencimento: string | null;
  arquivo_url: string | null;
  observacao: string | null;
  status: string;
}

interface Patrimonio {
  id: number;
  nome: string;
}

interface Funcionario {
  id: number;
  nome: string;
}

const TIPOS: { valor: string; rotulo: string; icone: string }[] = [
  { valor: "licenca", rotulo: "Licença", icone: "📋" },
  { valor: "seguro", rotulo: "Seguro de máquina", icone: "🚜" },
  { valor: "cnh", rotulo: "CNH", icone: "🪪" },
  { valor: "nota_fiscal", rotulo: "Nota fiscal", icone: "🧾" },
  { valor: "contrato", rotulo: "Contrato", icone: "📝" },
  { valor: "car", rotulo: "CAR (Cadastro Ambiental)", icone: "🌳" },
  { valor: "receituario", rotulo: "Receituário agronômico", icone: "🧪" },
  { valor: "certidao", rotulo: "Certidão / regularização", icone: "✅" },
  { valor: "outro", rotulo: "Outro", icone: "📄" },
];

function rotuloTipo(tipo: string) {
  return TIPOS.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}
function iconeTipo(tipo: string) {
  return TIPOS.find((t) => t.valor === tipo)?.icone ?? "📄";
}

function formatarData(data: string) {
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
}

function situacaoVencimento(dataVencimento: string | null) {
  if (!dataVencimento) return { rotulo: "Sem vencimento", estilo: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" };
  const hoje = new Date().toISOString().slice(0, 10);
  if (dataVencimento < hoje) {
    return { rotulo: "Vencido", estilo: "bg-danger/10 text-danger" };
  }
  const emDias = Math.round(
    (new Date(dataVencimento + "T12:00:00").getTime() - new Date(hoje + "T12:00:00").getTime()) / 86400000
  );
  if (emDias <= 30) {
    return { rotulo: `Vence em ${emDias}d`, estilo: "bg-warning/10 text-warning" };
  }
  return { rotulo: `Vence ${formatarData(dataVencimento)}`, estilo: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" };
}

export default function DocumentosPage() {
  const toast = useToast();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [tipo, setTipo] = useState("licenca");
  const [titulo, setTitulo] = useState("");
  const [patrimonioId, setPatrimonioId] = useState<number | "">("");
  const [funcionarioId, setFuncionarioId] = useState<number | "">("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function carregar() {
    setCarregando(true);
    fetch("/api/documentos")
      .then((r) => r.json())
      .then(setDocumentos)
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    fetch("/api/patrimonio").then((r) => r.json()).then(setPatrimonios);
    fetch("/api/employees").then((r) => r.json()).then(setFuncionarios);
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setTipo("licenca");
    setTitulo("");
    setPatrimonioId("");
    setFuncionarioId("");
    setNumeroDocumento("");
    setDataEmissao("");
    setDataVencimento("");
    setObservacao("");
    setArquivoUrl(null);
    setErro("");
    setModalAberto(true);
  }

  function abrirEdicao(d: Documento) {
    setEditandoId(d.id);
    setTipo(d.tipo);
    setTitulo(d.titulo);
    setPatrimonioId(d.patrimonio_id ?? "");
    setFuncionarioId(d.funcionario_id ?? "");
    setNumeroDocumento(d.numero_documento ?? "");
    setDataEmissao(d.data_emissao ?? "");
    setDataVencimento(d.data_vencimento ?? "");
    setObservacao(d.observacao ?? "");
    setArquivoUrl(d.arquivo_url);
    setErro("");
    setModalAberto(true);
  }

  async function salvar() {
    if (!titulo.trim()) {
      setErro("Digite um titulo para o documento.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const corpo = {
        tipo,
        titulo: titulo.trim(),
        patrimonio_id: tipo === "seguro" ? patrimonioId || null : null,
        funcionario_id: tipo === "cnh" ? funcionarioId || null : null,
        numero_documento: numeroDocumento.trim() || null,
        data_emissao: dataEmissao || null,
        data_vencimento: dataVencimento || null,
        observacao: observacao.trim() || null,
      };
      const url = editandoId ? `/api/documentos/${editandoId}` : "/api/documentos";
      const metodo = editandoId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!res.ok) {
        const data = await res.json();
        setErro(data.error ?? "Erro ao salvar documento.");
        return;
      }
      const salvo = await res.json();
      if (!editandoId) {
        setEditandoId(salvo.id);
      }
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function enviarArquivo(arquivo: File) {
    if (!editandoId) {
      setErro("Salve o documento antes de anexar o arquivo.");
      return;
    }
    setEnviandoArquivo(true);
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("documento_id", String(editandoId));
    try {
      const res = await fetch("/api/documentos/upload", { method: "POST", body: formData });
      if (res.ok) {
        const dados = await res.json();
        setArquivoUrl(dados.url);
        carregar();
      } else {
        const dados = await res.json().catch(() => ({}));
        toast.erro(dados.error ?? "Nao foi possivel enviar o arquivo. Tente novamente.");
      }
    } catch {
      toast.erro("Nao foi possivel enviar o arquivo. Verifique sua conexao.");
    } finally {
      setEnviandoArquivo(false);
    }
  }

  async function excluir() {
    if (!editandoId) return;
    if (!window.confirm(`Excluir "${titulo}"? Essa acao nao pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/documentos/${editandoId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.erro("Nao foi possivel excluir o documento. Tente novamente.");
        return;
      }
      setModalAberto(false);
      carregar();
    } catch {
      toast.erro("Nao foi possivel excluir o documento. Verifique sua conexao.");
    }
  }

  const documentosFiltrados = useMemo(() => {
    if (filtroTipo === "todos") return documentos;
    return documentos.filter((d) => d.tipo === filtroTipo);
  }, [documentos, filtroTipo]);

  return (
    <>
      <Header titulo="Documentos" subtitulo="Licenças, seguros e CNH com alerta de vencimento" />
      <div className="space-y-3 p-4 pb-24">
        <a
          href="/financiamentos"
          className="card flex items-center justify-between text-sm font-medium text-brand-600 dark:text-brand-400"
        >
          Financiamentos e parcelas de crédito rural
          <span aria-hidden="true">→</span>
        </a>

        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFiltroTipo("todos")}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              filtroTipo === "todos"
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
            }`}
          >
            Todos
          </button>
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              onClick={() => setFiltroTipo(t.valor)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                filtroTipo === t.valor
                  ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
              }`}
            >
              {t.icone} {t.rotulo}
            </button>
          ))}
        </div>

        {carregando ? (
          <div className="card animate-pulse text-center text-sm text-neutral-400">Carregando documentos...</div>
        ) : documentosFiltrados.length === 0 ? (
          <div className="card text-center">
            <p className="text-sm text-neutral-500">Nenhum documento cadastrado com esse filtro ainda.</p>
            <button className="btn-primary mt-4 w-full" onClick={abrirNovo}>
              + Novo documento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documentosFiltrados.map((d) => {
              const situacao = situacaoVencimento(d.data_vencimento);
              const vinculo = d.patrimonio_nome || d.funcionario_nome;
              return (
                <button key={d.id} onClick={() => abrirEdicao(d)} className="card block w-full text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {iconeTipo(d.tipo)} {d.titulo}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {rotuloTipo(d.tipo)}
                        {vinculo ? ` · ${vinculo}` : ""}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${situacao.estilo}`}>
                      {situacao.rotulo}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {documentosFiltrados.length > 0 && (
          <button className="btn-primary w-full" onClick={abrirNovo}>
            + Novo documento
          </button>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-neutral-900 sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editandoId ? "Editar documento" : "Novo documento"}</h2>
              <button onClick={() => setModalAberto(false)} className="text-2xl leading-none text-neutral-400" aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Tipo</label>
                <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.icone} {t.rotulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Título</label>
                <input
                  className="input-field"
                  placeholder="Ex: Seguro do trator Massey, CNH do João..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>

              {tipo === "seguro" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Máquina / patrimônio (opcional)</label>
                  <select
                    className="input-field"
                    value={patrimonioId}
                    onChange={(e) => setPatrimonioId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Nao vinculado</option>
                    {patrimonios.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tipo === "cnh" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Funcionário (opcional)</label>
                  <select
                    className="input-field"
                    value={funcionarioId}
                    onChange={(e) => setFuncionarioId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Nao vinculado</option>
                    {funcionarios.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Número do documento (opcional)</label>
                <input className="input-field" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Emissão (opcional)</label>
                  <input type="date" className="input-field" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Vencimento</label>
                  <input type="date" className="input-field" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
                </div>
              </div>

              <textarea
                className="input-field"
                rows={2}
                placeholder="Observação (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />

              {editandoId && (
                <div className="rounded-2xl border border-neutral-200 p-3 dark:border-neutral-700">
                  <label className="mb-1 block text-xs font-medium text-neutral-500">Arquivo (foto ou PDF)</label>
                  {arquivoUrl && (
                    <a href={arquivoUrl} target="_blank" rel="noreferrer" className="mb-2 block text-xs text-brand-600 dark:text-brand-400">
                      Ver arquivo anexado
                    </a>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    disabled={enviandoArquivo}
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      if (arquivo) enviarArquivo(arquivo);
                    }}
                    className="block w-full text-xs text-neutral-500"
                  />
                  {enviandoArquivo && <p className="mt-1 text-xs text-neutral-400">Enviando...</p>}
                </div>
              )}

              {erro && <p className="text-sm text-danger">{erro}</p>}

              <button className="btn-primary w-full" disabled={salvando} onClick={salvar}>
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Salvar documento"}
              </button>
              {editandoId && (
                <button onClick={excluir} className="w-full rounded-xl border border-danger py-3 text-sm font-medium text-danger">
                  Excluir documento
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
