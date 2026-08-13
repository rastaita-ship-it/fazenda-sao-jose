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
};

module.exports = nextConfig;
