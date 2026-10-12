/* ============================================================================
   PAMPA STAR · phaser/sw.js — el SERVICE WORKER de la PWA (V7 §5)
   Estrategia: PRECACHE de lo crítico al instalar (el juego abre offline) +
   cache-first en runtime para el resto (poses/caras/identidades entran al
   cache la primera vez que se ven y quedan). Al cambiar CACHE, el cache
   viejo se barre entero en activate (VERSION ya no lo barre: ver abajo).
   El scope es phaser/ (el clásico de la raíz no se toca).
   ========================================================================== */
"use strict";
/* LA VERSIÓN Y EL CACHÉ, SEPARADOS (revisión del lote L01 de la tanda 1.0).
   VERSION es la que se VE (editor, aviso "Algo se trabó", informe de error)
   y tiene que ser IGUAL a window.PAMPA_VERSION de index.html
   (informe.test.js). Antes era también el nombre del caché, y como activate
   barre todo caché que no se llame así, subirla le hacía bajar de nuevo las
   poses, caras y fondos a quien ya jugó: por eso el lote L01 salió con la
   misma "v16-toma" de antes y el informe no distinguía builds. Ahora CACHE
   queda quieto y VERSION se sube en CADA publicación que toque phaser/
   (paso del deploy, anotado en docs/TANDA_1_0.md). Cuando llegue
   cache-que-no-se-tira (L05, las dos cachés 'pampa-codigo-<VERSION>' y
   'pampa-assets'), CACHE se va. */
const VERSION = "v17-1.0-l04br";
const CACHE = "v16-toma";
const PRECACHE = [
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./vendor/phaser.min.js",
  "./logic/duel.js", "./logic/perspectiva.js", "./logic/partido.js",
  "./logic/relator.js", "./logic/definicion.js", "./logic/master.js",
  "./logic/temporada.js", "./logic/avatar.js", "./logic/tiro.js",
  "./logic/jugadon.js", "./logic/vida.js", "./logic/semana.js", "./logic/piel.js",
  "./logic/escudos.js", "./logic/ambiente.js", "./logic/vestir.js", "./logic/halo.js", "./logic/pierna.js", "./logic/lectura.js", "./logic/drama.js", "./logic/escalera.js",
  /* tanda 1.0: el informe de error. OJO, VERSION de acá arriba y
     window.PAMPA_VERSION de index.html se suben JUNTAS (informe.test.js) */
  "./logic/informe.js",
  /* tanda 1.0 (L03): el saneo del save del Master y el código de carrera */
  "./logic/save_master.js", "./logic/carrera.js",
  /* tanda 1.0 (L04): qué hace el atrás del teléfono en cada pantalla */
  "./logic/atras.js",
  "./audio/sfx.js",
  "./scenes/sprites.js", "./scenes/avatar_arte.js", "./scenes/intro.js",
  "./scenes/editor.js", "./scenes/master.js", "./scenes/match.js",
  "./scenes/definicion_ui.js", "./scenes/jugadon_ui.js", "./scenes/escenas_v9.js", "./scenes/cine_arte.js", "./scenes/toma_remate.js", "./scenes/piel_ui.js",
  "./scenes/escudos_ui.js", "./scenes/semana_ui.js", "./scenes/tribuna_ui.js", "./scenes/feel_ui.js", "./scenes/reloj.js",
  "./data/balance.json",
  "../data/semana.json", "../data/roster_pampeano.json", "../data/portraits_manifest.json",
  "../data/megacosas.json", "../data/relatos.json",
  "../data/poses_manifest.json", "../data/caras_manifest.json",
  "../data/divisiones.json", "../data/identidades_manifest.json",
  "../data/entrevista.json", "../data/tribuna.json", "../data/ambientes.json",
  "../assets/fonts/PressStart2P-Regular.ttf", "../assets/fonts/VT323-Regular.ttf",
  "../assets/fonts/PixelifySans-Regular.ttf",
  "../assets/fonts/ArchivoBlack-Regular.ttf", "../assets/fonts/BowlbyOne-Regular.ttf"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      /* tolerante: si un archivo del precache falta, los demás entran igual */
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
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
    if (res && res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
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
