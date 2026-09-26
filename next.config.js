const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Sem isso o Next 15 as vezes infere a raiz do workspace errado quando
  // encontra outro lockfile em uma pasta acima (ex: no $HOME do usuario),
  // o que bagunça o file tracing do build.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    cpus: 1,
  },
  // Cabecalhos basicos de seguranca: impedem que o app seja embutido num
  // iframe de outro site (clickjacking) e que o navegador "adivinhe" o
  // tipo de um arquivo servido (MIME sniffing). Sem CSP por enquanto —
  // exigiria mapear todo script/estilo inline do Next antes de travar.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
