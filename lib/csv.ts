export function parseCsv(texto: string): string[][] {
  const semBom = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const linhas: string[][] = [];
  let linhaAtual: string[] = [];
  let campoAtual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < semBom.length; i++) {
    const char = semBom[i];
    const proximo = semBom[i + 1];

    if (dentroDeAspas) {
      if (char === '"' && proximo === '"') {
        campoAtual += '"';
        i++;
      } else if (char === '"') {
        dentroDeAspas = false;
      } else {
        campoAtual += char;
      }
      continue;
    }

    if (char === '"') {
      dentroDeAspas = true;
    } else if (char === ",") {
      linhaAtual.push(campoAtual);
      campoAtual = "";
    } else if (char === "\n") {
      linhaAtual.push(campoAtual);
      linhas.push(linhaAtual);
      linhaAtual = [];
      campoAtual = "";
    } else if (char === "\r") {
      // ignorado, tratado junto com \n
    } else {
      campoAtual += char;
    }
  }

  if (campoAtual.length > 0 || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual);
    linhas.push(linhaAtual);
  }

  return linhas.filter((linha) => linha.some((v) => v.trim() !== ""));
}

export function montarCsv(cabecalho: string[], linhas: (string | number | null)[][]): string {
  function escapar(valor: string | number | null) {
    if (valor === null || valor === undefined) return "";
    const texto = String(valor);
    if (texto.includes(",") || texto.includes('"') || texto.includes("\n")) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  }

  const todasLinhas = [cabecalho.join(","), ...linhas.map((l) => l.map(escapar).join(","))];
  return "﻿" + todasLinhas.join("\n");
}
