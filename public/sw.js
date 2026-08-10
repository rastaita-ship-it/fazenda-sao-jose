const CACHE_NOME = "fazenda-sao-jose-v2";
const ARQUIVOS_ESSENCIAIS = ["/", "/ponto", "/manejo", "/manifest.json", "/logo.png", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes.filter((nome) => nome !== CACHE_NOME).map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (event.request.method !== "GET") {
    return;
  }

  const ehNavegacao = event.request.mode === "navigate";

  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      const buscaRede = fetch(event.request)
        .then((respostaRede) => {
          caches.open(CACHE_NOME).then((cache) => {
            cache.put(event.request, respostaRede.clone());
          });
          return respostaRede;
        })
        .catch(() => respostaCache || (ehNavegacao ? caches.match("/offline.html") : undefined));

      return respostaCache || buscaRede;
    })
  );
});

self.addEventListener("push", (event) => {
  let dados = { titulo: "Fazenda Sao Jose", corpo: "Voce tem um novo aviso.", url: "/" };
  if (event.data) {
    try {
      dados = { ...dados, ...event.data.json() };
    } catch (erro) {
      dados.corpo = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url: dados.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((listaClientes) => {
      for (const cliente of listaClientes) {
        if (cliente.url.includes(url) && "focus" in cliente) {
          return cliente.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
