import path from "path";
import fs from "fs";

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

export function pastaUpload(subpasta: string) {
  const caminho = path.join(UPLOADS_DIR, subpasta);
  if (!fs.existsSync(caminho)) {
    fs.mkdirSync(caminho, { recursive: true });
  }
  return caminho;
}

export const TAMANHO_MAXIMO_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/** Checa o tamanho do arquivo (via File.size, sem precisar ler o conteudo) antes de gravar em disco. */
export function arquivoDentroDoLimite(arquivo: File, limiteBytes = TAMANHO_MAXIMO_UPLOAD_BYTES): boolean {
  return arquivo.size > 0 && arquivo.size <= limiteBytes;
}

/** Converte um campo de formData (ex: "42") num inteiro positivo, ou null se invalido. */
export function parseIdObrigatorio(valorBruto: string | null): number | null {
  if (!valorBruto) return null;
  const id = Number(valorBruto);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

/**
 * Junta pastaDestino + nomeArquivo e garante que o resultado continua dentro de pastaDestino.
 * Retorna null se o nome do arquivo tentar escapar da pasta (ex: via "..").
 */
export function caminhoDeUploadSeguro(pastaDestino: string, nomeArquivo: string): string | null {
  const caminhoCompleto = path.join(pastaDestino, nomeArquivo);
  if (!path.resolve(caminhoCompleto).startsWith(path.resolve(pastaDestino) + path.sep)) {
    return null;
  }
  return caminhoCompleto;
}
