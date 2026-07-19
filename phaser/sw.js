/* ============================================================================
   PAMPA STAR · phaser/sw.js — el SERVICE WORKER de la PWA (V7 §5)
   Estrategia: PRECACHE de lo crítico al instalar (el juego abre offline) +
   cache-first en runtime para el resto (poses/caras/identidades entran al
   cache la primera vez que se ven y quedan). Al cambiar VERSION, el cache
   viejo se barre entero en activate — subir la versión con cada deploy que
   toque assets. El scope es phaser/ (el clásico de la raíz no se toca).
   ========================================================================== */
"use strict";
const VERSION = "pampa-star-v8-1";
const PRECACHE = [
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./vendor/phaser.min.js",
  "./logic/duel.js", "./logic/perspectiva.js", "./logic/partido.js",
  "./logic/relator.js", "./logic/definicion.js", "./logic/master.js",
  "./logic/temporada.js", "./logic/avatar.js", "./logic/tiro.js",
  "./logic/jugadon.js",
  "./audio/sfx.js",
  "./scenes/sprites.js", "./scenes/avatar_arte.js", "./scenes/intro.js",
  "./scenes/editor.js", "./scenes/master.js", "./scenes/match.js",
  "./scenes/definicion_ui.js",
  "./data/balance.json",
  "../data/roster_pampeano.json", "../data/portraits_manifest.json",
  "../data/megacosas.json", "../data/relatos.json",
  "../data/poses_manifest.json", "../data/caras_manifest.json",
  "../data/divisiones.json", "../data/identidades_manifest.json",
  "../assets/fonts/PressStart2P-Regular.ttf", "../assets/fonts/VT323-Regular.ttf"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      /* tolerante: si un archivo del precache falta, los demás entran igual */
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // nada de terceros
  /* assets PESADOS e inmutables entre deploys (poses, caras, motor vendored,
     íconos): cache-first — se bajan una vez y quedan */
  const pesado = url.pathname.includes("/assets/") || url.pathname.endsWith("phaser.min.js") || /icon-\d+\.png$/.test(url.pathname);
  const guardar = (res) => {
    if (res && res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); }
    return res;
  };
  if (pesado) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(guardar)));
  } else {
    /* código, data y html: NETWORK-FIRST — cada deploy de Rodri llega al toque;
       sin red, el cache responde y el juego abre offline igual */
    e.respondWith(
      fetch(e.request).then(guardar).catch(() => caches.match(e.request))
    );
  }
});
