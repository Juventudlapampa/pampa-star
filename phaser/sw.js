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
  /* tanda 1.0 (L05): los seis módulos que index.html carga desde el
     verano y nunca entraron acá. Sin red, la segunda visita abría sin mapa
     de La Pampa, sin cartas, sin cursor y sin música. Desde L05 lo vigila
     sw_precache.test.js: todo lo que carga index.html tiene que estar acá. */
  "./logic/musica.js", "./logic/mapa.js", "./logic/cartas.js", "./logic/foco.js",
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
  "./scenes/cartas_ui.js", "./scenes/foco_ui.js",
  "./data/balance.json",
  "../data/eventos_temporada.json", "../data/audio.json",
  "../data/semana.json", "../data/roster_pampeano.json", "../data/portraits_manifest.json",
  "../data/megacosas.json", "../data/relatos.json",
  "../data/poses_manifest.json", "../data/caras_manifest.json",
  "../data/divisiones.json", "../data/identidades_manifest.json",
  "../data/entrevista.json", "../data/tribuna.json", "../data/ambientes.json",
  "../assets/fonts/PressStart2P-Regular.ttf", "../assets/fonts/VT323-Regular.ttf",
  "../assets/fonts/PixelifySans-Regular.ttf",
  "../assets/fonts/ArchivoBlack-Regular.ttf", "../assets/fonts/BowlbyOne-Regular.ttf"
];

/* ═══ LA HUELLA DE LOS ASSETS (tanda 1.0, L05) ═══════════════════════════
   Tamaño y los primeros 12 caracteres del SHA-256 de cada archivo de
   assets/ (menos _fuente y los .md), del motor y de los íconos, con la ruta
   desde la raíz del sitio. NO SE EDITA A MANO: la genera
     node phaser/test/sw_precache.test.js --escribir
   y el mismo test pone la suite en rojo si un asset cambió y esto no.
   Por qué: 13 de los 16 commits que tocaron assets/ desde el 17/jul no
   tocaron sw.js, y como los assets salen primero de la caché, quien ya
   había jugado seguía viendo el archivo viejo (d6c88ae: el fondo del menú
   con el logo de una marca). La huella es la que dice qué asset cambió. */
const ASSETS_HUELLA = {
  "assets/fonts/ArchivoBlack-Regular.ttf": "90988-dd9a89a019b4",
  "assets/fonts/BowlbyOne-Regular.ttf": "59856-c46a806d7b51",
  "assets/fonts/PixelifySans-Regular.ttf": "79160-9ba86cd010a4",
  "assets/fonts/PressStart2P-Regular.ttf": "118204-034c77f1f05e",
  "assets/fonts/VT323-Regular.ttf": "153116-cf4de751ada7",
  "assets/musica/After_the_Rain_Stops.ogg": "385259-d820751c0e7d",
  "assets/musica/Beyond_the_Mushroom_Bridge.ogg": "362928-8ee4f90f4436",
  "assets/musica/Cielo_de_victoria.ogg": "362906-a7db278ca6f5",
  "assets/musica/Fuerza_de_un_Leon.ogg": "360267-00d33bc00330",
  "assets/musica/Last_Ten_Seconds_loop.ogg": "278660-119eb1d188ec",
  "assets/musica/Low_Light_Protocol_loop.ogg": "189057-7de3f4f1d204",
  "assets/musica/Quiet_Morning_Walk_loop.ogg": "303553-34113bb418da",
  "assets/musica/The_Longest_Minute_loop.ogg": "268165-2fec4e3c9a5b",
  "assets/musica/The_Winning_Strike_loop.ogg": "330297-321427204ea0",
  "assets/musica/Under_the_Floodlights.ogg": "376161-007bb4d08333",
  "assets/musica/Victory_Lap_At_Dawn.ogg": "422349-4c81e6249f46",
  "assets/musica/Voltage_Breakaway_loop.ogg": "314649-ae2d6352e908",
  "assets/poses/arbitro_amarilla.webp": "65142-8ea2d7aae81a",
  "assets/poses/arco.webp": "285944-d707de1709b6",
  "assets/poses/banco.webp": "107012-c57ba1a68bc5",
  "assets/poses/banderin.webp": "63552-f37c1ab07606",
  "assets/poses/calden.webp": "242662-ba82b6271c88",
  "assets/poses/caras/cara_clasico.png": "263728-0d26330b9a08",
  "assets/poses/caras/cara_colorado.png": "336798-a06cbd540685",
  "assets/poses/caras/cara_flequillo.png": "267709-13577a406a7e",
  "assets/poses/caras/cara_melena.png": "313742-8ae77f2cd0a1",
  "assets/poses/caras/cara_mohicano.png": "239149-909e123195a4",
  "assets/poses/caras/cara_rapado.png": "210214-3e5efb597248",
  "assets/poses/caras/cara_rulos.png": "297238-4f2bfe3b5b16",
  "assets/poses/caras/cara_tranqui.png": "280940-02126604f58b",
  "assets/poses/fondo_tribuna.webp": "209714-28efab48dfd2",
  "assets/poses/hincha_bandera.webp": "7818-37abb28816f5",
  "assets/poses/hincha_bebe.webp": "6718-31e759129838",
  "assets/poses/hincha_bombo.webp": "11538-33a49b1b19f4",
  "assets/poses/hincha_mate.webp": "7330-8cc92edfa4ab",
  "assets/poses/hincha_parado.webp": "5388-944ad0cbd854",
  "assets/poses/identidades/jugador_colorado.png": "280298-e4254b46ef29",
  "assets/poses/identidades/jugador_largo.png": "289883-fc41adb6e4ad",
  "assets/poses/identidades/jugador_rapado.png": "232062-96fd6e4b586d",
  "assets/poses/identidades/jugador_rulos.png": "264336-287fa7d9e166",
  "assets/poses/identidades/rival_flequillo.png": "262674-d27517790add",
  "assets/poses/identidades/rival_mohicano.png": "252778-b013521bb237",
  "assets/poses/pelota_vieja.webp": "156944-45bcf2226657",
  "assets/poses/poseR_arquero_vuela.webp": "83774-9c2ee3c4604c",
  "assets/poses/poseR_corriendo.webp": "97094-fee5a3a5a94d",
  "assets/poses/poseR_quite.webp": "94810-ec69fd4f3b00",
  "assets/poses/pose_arquero_ataja_celeste.webp": "124132-439450d1fb3c",
  "assets/poses/pose_arquero_ataja_v2.webp": "65794-fafeac4719e5",
  "assets/poses/pose_arquero_despeje_celeste.webp": "96708-a0aa53afba01",
  "assets/poses/pose_arquero_vuela_celeste.webp": "72928-7a319a0f6b2f",
  "assets/poses/pose_arquero_vuela_v2.webp": "65298-be4bfde78e00",
  "assets/poses/pose_barrida.webp": "96218-6c868c830341",
  "assets/poses/pose_bloqueo.webp": "79596-2bf5e12f021c",
  "assets/poses/pose_cabezazo.webp": "80818-7c560a6cf4c0",
  "assets/poses/pose_cabezazo_v2.webp": "103906-eb9a5a08cd9a",
  "assets/poses/pose_cansado.webp": "90458-87eb97f75c9a",
  "assets/poses/pose_celebracion.webp": "102914-48c49c0c7c8d",
  "assets/poses/pose_chilena.webp": "71118-7a3b1a361ae0",
  "assets/poses/pose_corriendo.webp": "96036-2136e823e660",
  "assets/poses/pose_corriendo_1.webp": "71238-a99fd19ec2e6",
  "assets/poses/pose_corriendo_2.webp": "79446-b8df13ea37e1",
  "assets/poses/pose_corriendo_3.webp": "79838-fe3d0ee21a7d",
  "assets/poses/pose_de_espaldas.webp": "81136-4c5e262d5a8c",
  "assets/poses/pose_de_espaldas_sin_pelota.webp": "74400-bbc8728b4baa",
  "assets/poses/pose_festejo.webp": "90114-f5ea764d04cf",
  "assets/poses/pose_gambeta_gana.webp": "81338-1ad00d9ca5ad",
  "assets/poses/pose_gambeta_pierde.webp": "99352-bba9e43a41b7",
  "assets/poses/pose_pared.webp": "87668-da3c378de835",
  "assets/poses/pose_pase.webp": "96084-d0f56f6992f0",
  "assets/poses/pose_quite.webp": "93386-8307d1d49608",
  "assets/poses/pose_recibiendo.webp": "91518-ef4134aa3929",
  "assets/poses/pose_remate.webp": "98626-142b32400795",
  "assets/poses/pose_tiro.webp": "75880-bd3e2073f1cb",
  "assets/poses/pose_volea.webp": "80534-eeb594deb665",
  "assets/retratos/retrato_dt.webp": "127342-0589d5dede64",
  "assets/retratos/retrato_juvenil.webp": "9772-6d3b47d04e95",
  "assets/retratos/retrato_nelda.webp": "169152-1e86395ec760",
  "assets/retratos/retrato_nito.webp": "154644-53dad4376b78",
  "assets/retratos/retrato_pibe_1.webp": "21562-040cdcec0c0f",
  "assets/retratos/retrato_pibe_2.webp": "21602-770679e15fb2",
  "assets/retratos/retrato_pibe_3.webp": "22700-6d96d1379809",
  "assets/retratos/retrato_pibe_4.webp": "20654-31c04dac59eb",
  "assets/retratos/retrato_pibe_5.webp": "20396-8a5998cfeb4e",
  "assets/retratos/retrato_pibe_6.webp": "21100-28dbfa397832",
  "assets/retratos/retrato_tuli.webp": "166254-3c9f9cd9c46a",
  "assets/retratos/retrato_utilero.webp": "217130-8771d18a33ca",
  "assets/ui/bg-01-cielo-atardecer.webp": "39668-2dc7c109d0ba",
  "assets/ui/bg-02-alambrado-campo.webp": "38074-27462b49a253",
  "assets/ui/bg-03-tribuna-tablones.webp": "54468-201d508f0e98",
  "assets/ui/bg-04-tierra-pasto-seco.webp": "219622-1ad7c648f7af",
  "assets/ui/bg-05-horizonte-molino.webp": "26064-dbdabf7d3270",
  "assets/ui/bg-06-noche-luces.webp": "29686-ad4299b2abd1",
  "assets/ui/cartel-pueblo.webp": "47034-b74ed235a1ff",
  "assets/ui/escudo-club.webp": "44754-1ad5080172b0",
  "assets/ui/fondo_menu.webp": "43694-b0a8ae48c949",
  "assets/ui/fondo_pueblo.webp": "64366-6ca0b199d95d",
  "assets/ui/heroe.webp": "85138-5a25598f6d61",
  "assets/ui/logo.webp": "39304-840372f8c6e7",
  "assets/ui/pampa-star-logo-horizontal.webp": "63116-8cc0ef1ded46",
  "assets/ui/pampa-star-logo.webp": "93612-0b26a465433e",
  "assets/ui/portada.webp": "55732-cbb1e9a4ea31",
  "assets/ui/relatores.webp": "64798-7365607f1d93",
  "phaser/icon-192.png": "5547-3f00ab2c0d5c",
  "phaser/icon-512.png": "18225-880063768ecc",
  "phaser/vendor/phaser.min.js": "1181917-62081f6a1b51"
};

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
