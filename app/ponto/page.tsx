"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import AvisoAtividadesHoje from "@/components/dashboard/AvisoAtividadesHoje";
import { useAuth } from "@/components/auth/AuthContext";

interface Funcionario {
  id: number;
  nome: string;
  funcao: string | null;
}

interface RegistroPonto {
  id: number;
  funcionario_id: number;
  tipo: "entrada" | "saida";
  data_hora: string;
  funcionario_nome: string;
  foto_url: string | null;
}

function comprimirFoto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const LARGURA_MAXIMA = 480;
        const escala = Math.min(1, LARGURA_MAXIMA / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * escala;
        canvas.height = img.height * escala;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Nao foi possivel processar a foto."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = () => reject(new Error("Nao foi possivel carregar a foto."));
      img.src = leitor.result as string;
    };
    leitor.onerror = () => reject(new Error("Nao foi possivel ler a foto."));
    leitor.readAsDataURL(arquivo);
  });
}

function formatarHora(dataHora: string) {
  return new Date(dataHora.replace(" ", "T")).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obterLocalizacao(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este navegador nao suporta localizacao."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () =>
        reject(
          new Error(
            "Nao foi possivel acessar sua localizacao. Verifique se o GPS esta ligado e se voce permitiu o acesso a localizacao para este site."
          )
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function PontoPage() {
  const usuario = useAuth();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [registrosHoje, setRegistrosHoje] = useState<RegistroPonto[]>([]);
  const [batendoId, setBatendoId] = useState<number | null>(null);
  const [funcionarioPendente, setFuncionarioPendente] = useState<number | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [funcaoNova, setFuncaoNova] = useState("");
  const [tipoNovo, setTipoNovo] = useState("campo");
  const [pinNovo, setPinNovo] = useState("");
  const [tipoContratoNovo, setTipoContratoNovo] = useState("fixo");
  const [salarioNovo, setSalarioNovo] = useState("");
  const [erroCadastro, setErroCadastro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  function carregarFuncionarios() {
    fetch("/api/employees").then((r) => r.json()).then(setFuncionarios);
  }

  function carregarRegistrosHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    fetch(`/api/timeclock?data=${hoje}`).then((r) => r.json()).then(setRegistrosHoje);
  }

  useEffect(() => {
    carregarFuncionarios();
    carregarRegistrosHoje();
  }, []);

  function ultimoRegistroDe(funcionarioId: number) {
    return registrosHoje.find((r) => r.funcionario_id === funcionarioId);
  }

  const CHAVE_FILA_OFFLINE = "fila_ponto_offline";

  function salvarNaFilaOffline(item: Record<string, unknown>): boolean {
    try {
      const filaAtual = JSON.parse(localStorage.getItem(CHAVE_FILA_OFFLINE) || "[]");
      filaAtual.push(item);
      localStorage.setItem(CHAVE_FILA_OFFLINE, JSON.stringify(filaAtual));
      return true;
    } catch {
      return false;
    }
  }

  async function sincronizarFilaOffline() {
    const fila: Record<string, unknown>[] = JSON.parse(
      localStorage.getItem(CHAVE_FILA_OFFLINE) || "[]"
    );
    if (fila.length === 0) return;

    const restante: Record<string, unknown>[] = [];
    for (const item of fila) {
      try {
        const res = await fetch("/api/timeclock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!res.ok) restante.push(item);
      } catch {
        restante.push(item);
      }
    }
    localStorage.setItem(CHAVE_FILA_OFFLINE, JSON.stringify(restante));
    if (restante.length < fila.length) {
      carregarRegistrosHoje();
    }
  }

  useEffect(() => {
    sincronizarFilaOffline();
    window.addEventListener("online", sincronizarFilaOffline);
    return () => window.removeEventListener("online", sincronizarFilaOffline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function iniciarBater(funcionarioId: number) {
    setMensagem("");
    setMensagemErro("");
    setFuncionarioPendente(funcionarioId);
    inputFotoRef.current?.click();
  }

  function aoSelecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || funcionarioPendente == null) return;
    continuarBater(funcionarioPendente, arquivo);
    setFuncionarioPendente(null);
  }

  async function continuarBater(funcionarioId: number, foto: File) {
    setBatendoId(funcionarioId);
    try {
      const fotoBase64 = await comprimirFoto(foto);
      const localizacao = await obterLocalizacao();
      const corpo = {
        funcionario_id: funcionarioId,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        foto_base64: fotoBase64,
        chave_cliente: crypto.randomUUID(),
      };

      try {
        const res = await fetch("/api/timeclock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        });

        const dados = await res.json();

        if (!res.ok) {
          setMensagemErro(dados.error ?? "Nao foi possivel registrar o ponto.");
          return;
        }

        const nomeFunc = funcionarios.find((f) => f.id === funcionarioId)?.nome ?? "";
        setMensagem(
          `Registrado: ${dados.tipo === "entrada" ? "Entrada" : "Saida"} para ${nomeFunc} as ${formatarHora(dados.data_hora)}`
        );
        carregarRegistrosHoje();
        setTimeout(() => setMensagem(""), 4000);
      } catch {
        const salvo = salvarNaFilaOffline(corpo);
        if (salvo) {
          setMensagem("Sem sinal agora. Ponto salvo no celular e sera enviado quando a internet voltar.");
          setTimeout(() => setMensagem(""), 6000);
        } else {
          setMensagemErro(
            "Sem sinal e sem espaco de armazenamento neste celular para guardar o ponto. Tente novamente com internet."
          );
        }
      }
    } catch (err) {
      setMensagemErro(err instanceof Error ? err.message : "Erro ao registrar o ponto.");
    } finally {
      setBatendoId(null);
    }
  }

  async function salvarFuncionario() {
    if (!nomeNovo.trim()) return;
    setErroCadastro("");
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nomeNovo.trim(),
        funcao: funcaoNova.trim() || null,
        tipo: tipoNovo,
        pin: pinNovo,
        tipo_contrato: tipoContratoNovo,
        salario_mensal: tipoContratoNovo === "fixo" && salarioNovo ? Number(salarioNovo.replace(",", ".")) : null,
      }),
    });
    const dados = await res.json();
    if (!res.ok) {
      setErroCadastro(dados.error ?? "Erro ao cadastrar funcionario.");
      return;
    }
    setNomeNovo("");
    setFuncaoNova("");
    setTipoNovo("campo");
    setPinNovo("");
    setTipoContratoNovo("fixo");
    setSalarioNovo("");
    setMostrarForm(false);
    carregarFuncionarios();
  }

  return (
    <>
      <Header titulo="Ponto Eletronico" subtitulo="Registro de entrada e saida" />
      <input
        ref={inputFotoRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={aoSelecionarFoto}
      />
      <div className="space-y-3 p-4">
        <AvisoAtividadesHoje />
        {mensagem && (
          <div className="card border-brand-300 bg-brand-50 text-center text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {mensagem}
          </div>
        )}
        {mensagemErro && (
          <div className="card border-danger bg-red-50 text-center text-sm font-medium text-danger dark:bg-red-900/20">
            {mensagemErro}
          </div>
        )}

        <a
          href="/ponto/banco-de-horas"
          className="block w-full rounded-2xl border border-neutral-300 py-3 text-center text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
        >
          Ver banco de horas
        </a>

        {funcionarios.length === 0 && (
          <div className="card text-center text-sm text-neutral-400">
            Nenhum funcionario cadastrado ainda.
          </div>
        )}

        {funcionarios.map((f) => {
          const ultimo = ultimoRegistroDe(f.id);
          const proximaAcao = !ultimo || ultimo.tipo === "saida" ? "entrada" : "saida";
          return (
            <div key={f.id} className="card flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{f.nome}</p>
                {f.funcao && <p className="text-xs text-neutral-500">{f.funcao}</p>}
                {ultimo && (
                  <p className="text-xs text-neutral-400">
                    Ultimo registro hoje: {ultimo.tipo === "entrada" ? "Entrada" : "Saida"} as{" "}
                    {formatarHora(ultimo.data_hora)}
                    {ultimo.foto_url && (
                      <a href={ultimo.foto_url} target="_blank" rel="noreferrer" className="ml-1">
                        📷
                      </a>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={() => iniciarBater(f.id)}
                disabled={batendoId === f.id}
                className={proximaAcao === "entrada" ? "btn-primary" : "btn-danger"}
                style={{ minWidth: "110px" }}
              >
                {batendoId === f.id
                  ? "Enviando..."
                  : proximaAcao === "entrada"
                  ? "Bater entrada"
                  : "Bater saida"}
              </button>
            </div>
          );
        })}

        {usuario?.tipo === "chefe" && (
        <>
        {!mostrarForm ? (
          <button className="btn-primary w-full" onClick={() => setMostrarForm(true)}>
            + Cadastrar funcionario
          </button>
        ) : (
          <div className="card space-y-3">
            <input
              className="input-field"
              placeholder="Nome do funcionario"
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Funcao (opcional): Vaqueiro, Diarista..."
              value={funcaoNova}
              onChange={(e) => setFuncaoNova(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTipoNovo("campo")}
                className={`rounded-xl border py-2 text-sm font-medium ${
                  tipoNovo === "campo"
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                }`}
              >
                Colaborador
              </button>
              <button
                onClick={() => setTipoNovo("chefe")}
                className={`rounded-xl border py-2 text-sm font-medium ${
                  tipoNovo === "chefe"
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                }`}
              >
                Administrador
              </button>
            </div>
            <input
              className="input-field"
              placeholder="PIN de 4 numeros (para entrar no app)"
              inputMode="numeric"
              maxLength={4}
              value={pinNovo}
              onChange={(e) => setPinNovo(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTipoContratoNovo("fixo")}
                className={`rounded-xl border py-2 text-sm font-medium ${
                  tipoContratoNovo === "fixo"
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                }`}
              >
                Contrato fixo
              </button>
              <button
                onClick={() => setTipoContratoNovo("diarista")}
                className={`rounded-xl border py-2 text-sm font-medium ${
                  tipoContratoNovo === "diarista"
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-neutral-300 text-neutral-500 dark:border-neutral-700"
                }`}
              >
                Diarista/Temporario
              </button>
            </div>
            {tipoContratoNovo === "fixo" && (
              <input
                className="input-field"
                placeholder="Salario mensal (R$) - opcional"
                inputMode="decimal"
                value={salarioNovo}
                onChange={(e) => setSalarioNovo(e.target.value)}
              />
            )}
            {erroCadastro && <p className="text-sm text-danger">{erroCadastro}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-xl border border-neutral-300 py-3 text-sm font-medium text-neutral-500 dark:border-neutral-700"
                onClick={() => setMostrarForm(false)}
              >
                Cancelar
              </button>
              <button className="btn-primary" onClick={salvarFuncionario}>
                Salvar
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </>
  );
}
