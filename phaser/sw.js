/* ============================================================================
   PAMPA STAR · phaser/sw.js — el SERVICE WORKER de la PWA (V7 §5; rehecho
   en la tanda 1.0, lote L05). El scope es phaser/ (el clásico no se toca).

   ═══ DOS CACHÉS (L05, cache-que-no-se-tira) ═══

   Lo que estaba mal, medido: todo, imágenes de /assets/ incluidas, iba a UNA
   caché, y activate borraba toda caché con otro nombre. Cada versión nueva
   tiraba las poses, caras y fondos ya bajados: unos 12 MB por persona en
   cada deploy (14.102.712 bytes de assets servidos, du sobre git ls-files),
   con datos prepagos. Por eso desde L01 el nombre de la caché quedó
   congelado en "v16-toma" y la versión iba aparte. Y la música no entraba
   NUNCA: el <audio> pide con Range, el server contesta 206 y Cache.put
   rechaza los 206 (lo dice la especificación), así que volvía a bajar en
   cada sesión.

   Ahora:
     · "pampa-codigo-<VERSION>": html, js y json. Se barre en cada versión,
       como antes: el código de una versión no se mezcla con el de otra.
       Desde la revisión L05 eso también vale ADENTRO: solo se escribe con
       lo que se sabe de VERSION (ver "CADA PÁGINA, ATADA…").
     · "pampa-assets": poses, caras, fondos, música, tipografías, motor e
       íconos. SOBREVIVE a las versiones. Cada entrada se guarda con su
       huella en la clave (ruta?h=<huella>, ver ASSETS_HUELLA): si un asset
       cambia, cambia su clave, se baja SOLO ese y activate borra la entrada
       vieja. Lo que no cambió no se vuelve a pedir nunca.
     · la música se pide al server SIN Range (el archivo entero, 200), se
       guarda ese 200 y a cada pedido con Range se le contesta el pedazo que
       pidió (206) sacado de la caché.

   ═══ CON SEÑAL FLOJA (L05, arranque-con-senal-floja) ═══

     · el código va primero a la red, pero con tope de 3 s: si hay copia y
       la red no contestó, contesta la copia (ver "EL CÓDIGO");
     · la instalación es atómica: o baja todo lo crítico o no se activa, y
       la caché anterior queda (ver "LA INSTALACIÓN ATÓMICA");
     · (revisión L05) cada página queda atada a la versión de su
       index.html y su código sale de un solo lado: un deploy con la señal
       floja no arma una página con scripts de dos versiones (ver "CADA
       PÁGINA, ATADA…");
     · (revisión L05) un asset que se está bajando no se pide dos veces, y
       lo que baja se guarda solo si coincide con su huella;
     · abrir el juego sin red con ?ref= o ?embed= en el link cae al
       index.html guardado.

   VERSION es la que se VE (editor, "Algo se trabó", informe de error) y es
   IGUAL a window.PAMPA_VERSION de index.html (informe.test.js). Se sube en
   cada publicación que toque phaser/: ahora eso solo barre el código.
   ========================================================================== */
"use strict";
const VERSION = "v17-1.0-l05r";
const CODIGO = "pampa-codigo-" + VERSION;
const ASSETS = "pampa-assets";
/* los temas que se bajan al instalar, por su clave de data/audio.json: el
   del menú y la intro, y los dos del partido (alternan por fecha).
   El resto entra cuando el <audio> lo pide: ante cualquier pedido de un
   tema sin copia este worker baja el archivo entero (responderAsset).
   Hasta L05 audio/sfx.js creaba los <audio> con preload="auto" y el mapa
   entero se bajaba junto al registrarse (medido: pampa-assets pasó de 3 a
   9 temas en 6 s sin que sonara ninguno). Desde L06 (carga-liviana) nacen
   con preload="none" y se precarga solo el tema que puede venir después
   del que suena (logic/musica.js, siguientes): así el primer toque de un
   tema no espera a que baje entero (ya se pidió antes) y lo que no se
   escucha en la sesión no le pelea la señal a las imágenes. */
const TEMAS_PRECACHE = ["opening", "partido", "partido_alt"];
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
  /* tanda 1.0 (L05): la carga con señal floja */
  "./logic/carga.js",
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

/* ═══ RUTAS Y CLAVES ════════════════════════════════════════════════════ */

/* la raíz del sitio, donde viven assets/ y data/ (sw.js está en phaser/) */
const RAIZ = new URL("../", self.location.href).href;
const RAIZ_RUTA = new URL(RAIZ).pathname;
const tiene = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* "assets/poses/x.webp", "phaser/logic/x.js"… o null si es de otro origen o
   de afuera de la raíz: en el hosting del sitio todos los repos de una cuenta
   comparten el origen, y lo de otro sitio no es asunto de este worker */
function rutaDe(url) {
  let u;
  try { u = new URL(url, self.location.href); } catch (err) { return null; }
  if (u.origin !== self.location.origin || u.pathname.indexOf(RAIZ_RUTA) !== 0) return null;
  const r = u.pathname.slice(RAIZ_RUTA.length);
  try { return decodeURIComponent(r); } catch (err) { return r; }
}
/* asset = lo que tiene huella, más cualquier cosa nueva debajo de assets/
   que todavía no la tenga (sale con la clave "?h=sin" y se barre en cada
   activación; sw_precache.test.js no deja que eso llegue a publicarse) */
function esAsset(ruta) { return !!ruta && (tiene(ASSETS_HUELLA, ruta) || ruta.indexOf("assets/") === 0); }
function claveAsset(ruta) { return RAIZ + ruta + "?h=" + (tiene(ASSETS_HUELLA, ruta) ? ASSETS_HUELLA[ruta] : "sin"); }
/* el código se guarda sin la parte de "?": un ?v= o un ?ref= no apila
   copias del mismo archivo */
function claveCodigo(url) { const u = new URL(url, self.location.href); return u.origin + u.pathname; }
/* ¿esta entrada de "pampa-assets" sigue valiendo? Solo si su huella es la
   de ahora */
function vigente(clave) {
  let u;
  try { u = new URL(clave); } catch (err) { return false; }
  const ruta = rutaDe(u.origin + u.pathname);
  return !!ruta && tiene(ASSETS_HUELLA, ruta) && ASSETS_HUELLA[ruta] === u.searchParams.get("h");
}
/* las cachés que son NUESTRAS y viejas: las de código de otra versión y
   las del esquema de antes ("pampa-star-v7-1" … "v16-toma", sacados de git
   log de este archivo). Antes activate borraba TODA caché con otro nombre, y
   en el mismo origen puede haber otros juegos de la cuenta con las suyas. */
function esNuestraVieja(nombre) {
  if (nombre === CODIGO || nombre === ASSETS) return false;
  return nombre.indexOf("pampa-codigo-") === 0 || /^pampa-star-v\d/.test(nombre) || /^v1\d-/.test(nombre);
}

/* la misma huella que genera phaser/test/_huella.js: tamaño-12 hex del
   SHA-256. Se usa para no guardar con la huella nueva un archivo viejo */
async function huellaDe(res) {
  const buf = await res.clone().arrayBuffer();
  const dig = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  let hex = "";
  for (let i = 0; i < 6; i++) hex += (dig[i] < 16 ? "0" : "") + dig[i].toString(16);
  return buf.byteLength + "-" + hex;
}

/* ═══ CUÁNTO VINO DE LA RED (window.__PAMPA_RED, se ve con ?perf=1) ═════
   Es un diagnóstico: no se manda a ningún lado, vive en la memoria de la
   página. Dos avisos:
     · lo que este worker bajó DE VERDAD: el transferSize de sus propios
       tiempos de recurso. Se probó primero con el Content-Length de cada
       respuesta y en el navegador daba 2,5 MB para una instalación que
       casi no tocó la red: un pedido "no-cache" que el server contesta 304
       le llega al worker como el 200 entero de la caché HTTP. transferSize
       cuenta los pocos bytes del 304, y 0 para lo que no salió a la red.
       Va a todas las ventanas (una entrada de tiempos no dice de qué
       página vino el pedido);
     · cada respuesta que sale de las cachés de acá, a la página que la
       pidió. */
if (typeof PerformanceObserver !== "undefined") {
  try {
    new PerformanceObserver((lista) => {
      let bytes = 0, pedidos = 0;
      const detalle = [];
      lista.getEntries().forEach((en) => {
        if (!(en.transferSize > 0)) return;
        bytes += en.transferSize; pedidos++;
        if (detalle.length < 20) detalle.push([rutaDe(en.name) || en.name, en.transferSize]);
      });
      if (pedidos) avisarATodos({ tipo: "pampa-red", origen: "red", bytes: bytes, pedidos: pedidos, detalle: detalle });
      try { performance.clearResourceTimings(); } catch (err) { }
    }).observe({ type: "resource" });
  } catch (err) { }
}
function avisar(clientId, datos) {
  if (!clientId || !self.clients || !self.clients.get) return Promise.resolve();
  return self.clients.get(clientId)
    .then((c) => { if (c) c.postMessage(Object.assign({ tipo: "pampa-red" }, datos)); })
    .catch(() => { });
}
function avisarATodos(datos) {
  if (!self.clients || !self.clients.matchAll) return Promise.resolve();
  return self.clients.matchAll({ type: "window", includeUncontrolled: true })
    .then((cs) => cs.forEach((c) => c.postMessage(datos)))
    .catch(() => { });
}

/* ═══ LOS ASSETS ═══════════════════════════════════════════════════════ */

/* un asset de la red: SIN Range (el archivo entero, para poder guardarlo:
   Cache.put rechaza los 206) y revalidando contra el server ("no-cache"),
   para que una copia de antes del deploy que quedó en la caché HTTP del
   navegador no se guarde con la huella nueva */
function pedirAsset(ruta, modo) {
  return fetch(new Request(RAIZ + ruta, { cache: modo || "no-cache" }));
}
/* ¿lo que devolvió la red ES el archivo de la huella de ahora? (revisión
   L05) El "no-cache" de pedirAsset esquiva la caché HTTP del navegador,
   pero no la copia vieja que puede tener la CDN del hosting mientras se
   propaga un deploy. responderAsset e instalar guardaban sin mirar (calentar
   y la mudanza sí miraban), y esa copia quedaba con la clave de la huella
   NUEVA hasta el próximo cambio de ese asset. Un asset sin huella todavía
   ("?h=sin") no tiene contra qué comparar: se guarda y se barre solo. */
async function esLaDeAhora(ruta, res) {
  return !tiene(ASSETS_HUELLA, ruta) || (await huellaDe(res)) === ASSETS_HUELLA[ruta];
}
/* al instalar, una copia con otra huella cuenta como NO bajada: con el
   reintento de conReintento, si sigue vieja la instalación atómica no
   termina y el worker anterior sigue con su caché (el navegador vuelve a
   probar en la próxima visita) */
async function bajarAsset(ruta) {
  const res = await pedirAsset(ruta);
  if (!res.ok || res.status !== 200) throw new Error("asset " + res.status + " " + ruta);
  if (!(await esLaDeAhora(ruta, res))) throw new Error("asset con otra huella (¿una copia vieja de la CDN?) " + ruta);
  return res;
}

/* el pedazo que pidió el <audio> (Range: bytes=a-b), sacado del 200 entero */
async function recortar(res, rango) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(rango).trim());
  if (!m || (m[1] === "" && m[2] === "")) return res;      // un formato que no sé cortar: el archivo entero
  const blob = await res.blob();
  const total = blob.size;
  let ini, fin;
  if (m[1] === "") { ini = Math.max(0, total - Number(m[2])); fin = total - 1; }
  else { ini = Number(m[1]); fin = m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1); }
  if (ini >= total || ini > fin) {
    return new Response(null, { status: 416, statusText: "Range Not Satisfiable", headers: { "Content-Range": "bytes */" + total } });
  }
  return new Response(blob.slice(ini, fin + 1), {
    status: 206, statusText: "Partial Content",
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/octet-stream",
      "Content-Range": "bytes " + ini + "-" + fin + "/" + total,
      "Content-Length": String(fin - ini + 1),
      "Accept-Ranges": "bytes"
    }
  });
}

/* LAS DESCARGAS EN VUELO (revisión L05). Con señal floja el loader de
   Phaser da por vencido un archivo (balance.red_floja.loader_timeout_ms) y
   lo vuelve a pedir una vez. El pedido que venció NO corta la descarga de
   acá (pedirAsset arma un Request nuevo, sin la señal del de la página), y
   el reintento arrancaba OTRA: medido en node con cara_colorado colgada,
   el pedido, 15 s y el reintento: dos pedidos a la red por la misma cara,
   hasta el doble de datos prepagos. Ahora un asset que ya se está bajando
   no se vuelve a pedir: el pedido nuevo espera a que termine esa descarga y
   lo saca de la caché. Si esa descarga falló (no quedó en la caché), lo
   pide él. clave → promesa que se cumple cuando la descarga terminó. */
const enVuelo = new Map();

/* primero la caché (con la huella de ahora), después la red */
async function responderAsset(e, ruta) {
  const cache = await caches.open(ASSETS);
  const clave = claveAsset(ruta);
  let res;
  for (;;) {
    res = await cache.match(clave, { ignoreVary: true });
    const vuelo = res ? null : enVuelo.get(clave);
    if (!vuelo) break;
    await vuelo;
  }
  if (res) {
    avisar(e.clientId, { origen: "cache", ruta: ruta });
  } else {
    /* se anota ANTES de esperar a la red (sin un await entre la mirada de
       arriba y esto): una descarga colgada antes de los encabezados también
       cuenta como "en vuelo" */
    let terminar;
    const vuelo = new Promise((r) => { terminar = r; });
    enVuelo.set(clave, vuelo);
    const soltar = () => { if (enVuelo.get(clave) === vuelo) enVuelo.delete(clave); terminar(); };
    try { res = await pedirAsset(ruta); } catch (err) { soltar(); throw err; }
    if (res.ok && res.status === 200) {
      /* se sirve igual (es lo que hay), pero con otra huella no se guarda:
         el pedido siguiente vuelve a la red */
      const copia = res.clone();
      e.waitUntil(esLaDeAhora(ruta, copia)
        .then((si) => (si ? cache.put(clave, copia) : null))
        .catch(() => { }).then(soltar));
    } else soltar();
  }
  const rango = e.request.headers.get("range");
  if (rango && res.status === 200) return recortar(res, rango);
  return res;
}

/* LA MUDANZA. Quien ya jugó tiene sus poses en una caché del esquema viejo
   ("v16-toma"). Antes de bajar nada, lo que está ahí y coincide con la
   huella (tamaño y SHA-256 recalculados acá) pasa a "pampa-assets". Sin
   esto, el deploy que trae las dos cachés le hacía bajar todo una vez más
   a cada persona que ya había jugado. */
async function rescatar(assets) {
  let n = 0;
  const nombres = (await caches.keys()).filter(esNuestraVieja);
  for (const nombre of nombres) {
    const vieja = await caches.open(nombre);
    for (const req of await vieja.keys()) {
      const ruta = rutaDe(req.url);
      if (!ruta || !tiene(ASSETS_HUELLA, ruta)) continue;
      const clave = claveAsset(ruta);
      if (await assets.match(clave, { ignoreVary: true })) continue;
      const res = await vieja.match(req);
      if (!res || res.status !== 200) continue;
      if ((await huellaDe(res)) !== ASSETS_HUELLA[ruta]) continue;
      await assets.put(clave, res);
      n++;
    }
  }
  return n;
}

/* los temas de TEMAS_PRECACHE, a lo que dé: si no bajan, la instalación
   sigue (sin música el juego igual se juega). La carpeta es la misma que usa
   logic/musica.js (base "../assets/musica/"). */
async function precachearMusica(assets, codigo) {
  try {
    const r = await codigo.match(claveCodigo(new URL("../data/audio.json", self.location.href).href), { ignoreVary: true });
    const temas = ((r && await r.json()) || {}).temas || {};
    for (const id of TEMAS_PRECACHE) {
      const t = temas[id];
      if (!t || !t.archivo) continue;
      const ruta = "assets/musica/" + t.archivo;
      const clave = claveAsset(ruta);
      if (await assets.match(clave, { ignoreVary: true })) continue;
      try { await assets.put(clave, await bajarAsset(ruta)); } catch (err) { }
    }
  } catch (err) { }
}

/* EL CALENTAMIENTO. En la primera visita el worker se registra en "load", y
   la intro ya pidió sus poses ANTES de que él controlara la página: esas no
   pasaron por acá y sin red, en la segunda visita, faltaban. Cuando la
   página queda controlada manda la lista de lo que bajó por su cuenta, y
   acá se guarda sacándolo de la caché HTTP del navegador ("force-cache": ya
   está bajado, no cuesta red). Como esa copia puede ser de antes de un
   deploy, se guarda solo si su huella es la de ahora. La música no: el
   <audio> la pidió en pedazos y traerla entera sería bajarla otra vez. */
async function calentar(urls) {
  const assets = await caches.open(ASSETS);
  const vistas = {};
  let n = 0;
  for (const u of urls.slice(0, 400)) {
    const ruta = rutaDe(u);
    if (!ruta || vistas[ruta] || !tiene(ASSETS_HUELLA, ruta) || ruta.indexOf("assets/musica/") === 0) continue;
    vistas[ruta] = true;
    const clave = claveAsset(ruta);
    if (await assets.match(clave, { ignoreVary: true })) continue;
    try {
      const res = await pedirAsset(ruta, "force-cache");
      if (!res.ok || res.status !== 200) continue;
      if ((await huellaDe(res)) !== ASSETS_HUELLA[ruta]) continue;
      await assets.put(clave, res);
      n++;
    } catch (err) { }
  }
  return n;
}

/* ═══ EL CÓDIGO: LA RED PRIMERO, PERO CON TOPE ══════════════════════════
   (L05, arranque-con-senal-floja) La meta es la localidad con mala señal,
   donde la red casi nunca FALTA: se CUELGA. Antes era
   fetch(e.request).then(guardar).catch(() => caches.match(...)): la caché
   contestaba solo si la red FALLABA, no si tardaba, y una raya de señal
   dejaba esperando cada uno de los 50 scripts y 14 JSON del arranque.
   Ahora:
     · la red tiene TOPE_RED_MS (3 s). Si no contestó y hay copia, contesta
       la copia; la red sigue de fondo y, cuando llega, actualiza la caché;
     · pasado un tope, la señal queda "floja" FLOJA_MS (30 s): mientras,
       todo lo que tenga copia sale de la caché al toque, sin esperar otros
       3 s por archivo (si no, el arranque serían 3 s de la página + 3 de los
       scripts + 3 de los JSON). Una respuesta de la red a tiempo la apaga;
     · sin copia, se espera a la red lo que haga falta (la página pone sus
       propios topes: index.html a los JSON, el loader de Phaser a cada
       archivo);
     · una NAVEGACIÓN (abrir el juego) cae a index.html sin mirar lo que va
       después del "?": un link con ?ref= o ?embed= abre igual sin red.

   ═══ CADA PÁGINA, ATADA A LA VERSIÓN DE SU index.html (revisión L05) ═══
   Lo que estaba mal, medido en node (red_lenta.test.js [f]): recién hecho
   un deploy y con la señal floja, la página traía index.html y duel.js
   nuevos de la red y match.js VIEJO de la caché a los 3,1 s: código de dos
   versiones en la misma carga. Y al revés: con index.html de la caché, una
   respuesta rápida de la red apagaba lo "flojo" y lo que seguía venía del
   deploy nuevo. Además cada respuesta de la red se guardaba en
   pampa-codigo-<VERSION> aunque fuera de otro deploy: la caché de esta
   versión terminaba con duel.js de la siguiente. Ahora la navegación decide
   de qué versión es la página (atar) y su código sale de un solo lado:
     · index.html de la CACHÉ → la página es VERSION (esta caché solo
       guarda VERSION): su código sale de la caché, y de la red solo lo que
       no tenga copia (sin guardarlo: no se sabe de qué versión es);
     · index.html de la RED → se lee window.PAMPA_VERSION en sus primeros
       bytes (a 14,7 KB del principio; el primer <script src>, a 49 KB):
         - igual a VERSION: la red y la caché son la misma versión. La red
           primero con tope, la copia de respaldo, y lo que baja se guarda;
         - otra (o no se encuentra): hay un deploy que este worker todavía
           no tiene. Su código va SOLO a la red, sin tope y sin respaldo (la
           copia es de otra versión), y no se guarda. Mientras, el navegador
           instala el worker nuevo;
     · una página que el worker no ató (la primera visita, que se registró
       con la página ya abierta) sigue como antes, pero lo que baja no se
       guarda.
   Lo atado vive en memoria y en la caché "pampa-paginas": el navegador mata
   al worker a los 30 s sin eventos, y el partido pide su manifest de
   identidades mucho después del arranque. */
const TOPE_RED_MS = 3000;
const FLOJA_MS = 30000;
let flojaHasta = 0;

const PAGINAS = "pampa-paginas";
const PAGINAS_MAX = 20;            // las últimas páginas abiertas; más viejas no piden nada
const MARCA_MAX = 65536;           // hasta dónde se busca la marca de versión en index.html
const paginas = new Map();         // clientId → promesa de { v: versión de su index.html, deCache }
function clavePagina(id) { return RAIZ + "__pagina/" + encodeURIComponent(id); }

/* la página (resultingClientId de la navegación) queda atada a lo que
   resuelva vinculo; se anota también en pampa-paginas */
function atar(id, vinculo, e) {
  if (!id) return;
  paginas.set(id, vinculo);
  if (paginas.size > PAGINAS_MAX) paginas.delete(paginas.keys().next().value);
  e.waitUntil(vinculo.then(async (v) => {
    if (!v) return;
    const c = await caches.open(PAGINAS);
    await c.put(clavePagina(id), new Response(JSON.stringify(v), { headers: { "Content-Type": "application/json" } }));
    const ks = await c.keys();
    await Promise.all(ks.slice(0, Math.max(0, ks.length - PAGINAS_MAX)).map((k) => c.delete(k)));
  }).catch(() => { }));
}
async function vinculoDe(id) {
  if (!id) return null;
  if (paginas.has(id)) return paginas.get(id);
  try {
    const r = await (await caches.open(PAGINAS)).match(clavePagina(id));
    const v = r ? await r.json() : null;
    if (v) paginas.set(id, Promise.resolve(v));
    return v;
  } catch (err) { return null; }
}

/* window.PAMPA_VERSION de un index.html que vino de la red, leído de a
   pedazos sin esperar el archivo entero. El clon se hace YA (antes de que
   la página empiece a leer la respuesta); devuelve la versión o null */
function leerVersion(res) {
  let lector;
  try { lector = res.clone().body.getReader(); } catch (err) { return Promise.resolve(null); }
  return (async () => {
    const dec = new TextDecoder();
    let txt = "";
    try {
      while (txt.length < MARCA_MAX) {
        const { done, value } = await lector.read();
        if (done) break;
        txt += dec.decode(value, { stream: true });
        const m = /window\.PAMPA_VERSION\s*=\s*"([^"]+)"/.exec(txt);
        if (m) return m[1];
      }
      return null;
    } catch (err) { return null; }
    finally { lector.cancel().catch(() => { }); }
  })();
}

async function buscarCodigo(clave, navega) {
  try {
    const c = await caches.open(CODIGO);
    let hit = await c.match(clave, { ignoreVary: true });
    if (!hit && navega) hit = await c.match(new URL("./index.html", self.location.href).href, { ignoreSearch: true, ignoreVary: true });
    /* a una navegación no se le puede contestar con una respuesta que vino
       de una redirección: se rearma limpia */
    if (hit && navega && hit.redirected) hit = new Response(await hit.blob(), { status: hit.status, statusText: hit.statusText, headers: hit.headers });
    return hit;
  } catch (err) { return undefined; }
}

/* la red primero. op (revisión L05: quién puede contestar depende de la
   versión de la página, ver arriba):
     respaldo   si la copia de la caché puede contestar;
     conTope    si se le da TOPE_RED_MS a la red (y cuenta lo "flojo"); sin
                tope se espera a la red, y la copia solo si la red FALLA;
     guardar()  → promesa de sí/no: si lo que bajó se guarda en CODIGO;
     alLlegar(res)            la respuesta de la red, antes que nadie la lea;
     alContestar(res, deCache) quién contestó. */
function redPrimero(e, op) {
  const req = e.request;
  const navega = req.mode === "navigate";
  const clave = claveCodigo(req.url);
  const ruta = rutaDe(req.url);
  const t0 = Date.now();
  /* "no-cache": que la caché HTTP del navegador no conteste con un archivo
     de antes del deploy (el hosting lo deja fresco 10 minutos) y se
     mezclen versiones. Pasó en el navegador de prueba: después de un deploy
     la página trajo index.html nuevo y logic/carga.js viejo. Si el archivo
     no cambió, el server contesta 304: unos 300 bytes. */
  let guardar = Promise.resolve();
  const red = fetch(req, { cache: "no-cache" }).then((res) => {
    if (Date.now() - t0 < TOPE_RED_MS) flojaHasta = 0;
    if (op.alLlegar) op.alLlegar(res);
    if (op.guardar && res.ok && res.status === 200 && !res.redirected) {
      const copia = res.clone();
      guardar = Promise.resolve(op.guardar())
        .then((si) => (si ? caches.open(CODIGO).then((c) => c.put(clave, copia)) : null))
        .catch(() => { });
    }
    return res;
  });
  /* la red sigue viva aunque conteste la caché: cuando llega, actualiza
     (si op.guardar dice que es de esta versión) */
  e.waitUntil(red.then(() => guardar, () => { }));
  const enCache = op.respaldo ? buscarCodigo(clave, navega) : Promise.resolve(undefined);
  return new Promise((resolve) => {
    let listo = false;
    const dar = (r, deCache) => {
      if (listo || !r) return;
      listo = true;
      if (deCache) avisar(e.clientId, { origen: "cache", ruta: ruta });
      if (op.alContestar) op.alContestar(r, deCache);
      resolve(r);
    };
    let reloj = null;
    if (op.conTope) {
      if (Date.now() < flojaHasta) enCache.then((hit) => dar(hit, true));
      reloj = setTimeout(() => {
        flojaHasta = Date.now() + FLOJA_MS;
        enCache.then((hit) => dar(hit, true));
      }, TOPE_RED_MS);
    }
    red.then((res) => {
      clearTimeout(reloj);
      if (res.ok || res.type === "opaqueredirect") dar(res, false);
      else enCache.then((hit) => (hit ? dar(hit, true) : dar(res, false)));
    }, () => {
      clearTimeout(reloj);
      enCache.then((hit) => (hit ? dar(hit, true) : dar(Response.error(), false)));
    });
  });
}

/* abrir el juego: la red con tope y la copia de respaldo, como siempre; lo
   nuevo es que la página queda atada a la versión de lo que contestó, y que
   un index.html de la red se guarda solo si es de VERSION */
function navegar(e) {
  let resolverVinculo;
  const vinculo = new Promise((r) => { resolverVinculo = r; });
  atar(e.resultingClientId, vinculo, e);
  let versionRed = Promise.resolve(null);
  return redPrimero(e, {
    respaldo: true, conTope: true,
    alLlegar: (res) => { if (res.ok && res.body) versionRed = leerVersion(res); },
    guardar: () => versionRed.then((v) => v === VERSION),
    alContestar: (res, deCache) => {
      if (deCache) resolverVinculo({ v: VERSION, deCache: true });
      else versionRed.then((v) => resolverVinculo({ v: v || "?", deCache: false }));
    }
  });
}

/* el código que pide una página, según a qué versión quedó atada */
async function responderCodigo(e) {
  const vin = await vinculoDe(e.clientId);
  if (vin && vin.v !== VERSION) return redPrimero(e, { respaldo: false, conTope: false });
  if (vin && vin.deCache) {
    const hit = await buscarCodigo(claveCodigo(e.request.url), false);
    if (hit) { avisar(e.clientId, { origen: "cache", ruta: rutaDe(e.request.url) }); return hit; }
    return redPrimero(e, { respaldo: false, conTope: false });
  }
  return redPrimero(e, { respaldo: true, conTope: true, guardar: vin ? () => true : null });
}

/* ═══ INSTALAR Y ACTIVAR ═══════════════════════════════════════════════ */

/* LA INSTALACIÓN ATÓMICA (L05). Antes era Promise.allSettled y después
   skipWaiting: si la señal cortaba a mitad, el worker nuevo se activaba
   igual, activate borraba la caché anterior, y lo que no había bajado se
   perdía con ella (sin red, el juego abría a medias). Ahora todo lo crítico
   (el PRECACHE) se baja PRIMERO a memoria, con un reintento por archivo; si
   algo no baja, la instalación falla entera: no hay skipWaiting, este
   worker no se activa y el anterior sigue con su caché intacta (el
   navegador vuelve a intentar en la próxima visita). Recién con todo en la
   mano se escribe. La música va aparte y a lo que dé. */
async function bajarCodigo(url) {
  const res = await fetch(new Request(url, { cache: "no-cache" }));
  if (!res.ok || res.status !== 200) throw new Error("código " + res.status + " " + url);
  return res;
}
async function conReintento(f) {
  try { return await f(); } catch (err) { return f(); }
}
async function instalar() {
  const assets = await caches.open(ASSETS);
  try { await rescatar(assets); } catch (err) { }
  const bajados = await Promise.all(PRECACHE.map(async (u) => {
    const url = new URL(u, self.location.href).href;
    const ruta = rutaDe(url);
    if (esAsset(ruta)) {
      const clave = claveAsset(ruta);
      if (await assets.match(clave, { ignoreVary: true })) return null;   // ya está con esta huella: ni se pide
      return { aAssets: true, clave: clave, res: await conReintento(() => bajarAsset(ruta)) };
    }
    return { aAssets: false, clave: claveCodigo(url), res: await conReintento(() => bajarCodigo(url)) };
  }));
  /* (revisión L05) el index.html que bajó tiene que ser de ESTA versión.
     Mientras la CDN del hosting propaga un deploy puede servir sw.js nuevo
     con index.html viejo: se guardaba en pampa-codigo-<VERSION> la página
     de otra versión, y las páginas que abrieran desde la caché quedaban
     atadas a VERSION con el index.html equivocado. Si no coincide, la
     instalación no termina (atómica) y el navegador vuelve a probar */
  const claveIndex = claveCodigo(new URL("./index.html", self.location.href).href);
  const idx = bajados.find((b) => b && !b.aAssets && b.clave === claveIndex);
  if (idx && (await leerVersion(idx.res)) !== VERSION) throw new Error("index.html de otra versión (¿la CDN propagando un deploy?)");
  /* si la caché de código ya existía (sw.js cambió sin subir VERSION) es la
     que está usando el worker activo: si la escritura falla, no se borra */
  const yaEstaba = await caches.has(CODIGO);
  const codigo = await caches.open(CODIGO);
  try {
    await Promise.all(bajados.filter(Boolean).map((b) => (b.aAssets ? assets : codigo).put(b.clave, b.res)));
  } catch (err) {
    if (!yaEstaba) await caches.delete(CODIGO);
    throw err;
  }
  await precachearMusica(assets, codigo);
}

async function activar() {
  const nombres = await caches.keys();
  await Promise.all(nombres.filter(esNuestraVieja).map((k) => caches.delete(k)));
  /* de los assets, solo lo que cambió de huella (o ya no existe) */
  const assets = await caches.open(ASSETS);
  const claves = await assets.keys();
  await Promise.all(claves.filter((r) => !vigente(r.url)).map((r) => assets.delete(r)));
  await self.clients.claim();
  /* L05 (sw-robusto): a las páginas abiertas, qué versión entró. index.html
     compara con la suya y, si es otra, ofrece "Hay una versión nueva · TOCÁ
     PARA ACTUALIZAR" fuera del partido */
  await avisarATodos({ tipo: "pampa-version", version: VERSION });
}

self.addEventListener("install", (e) => {
  e.waitUntil(instalar().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(activar());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const ruta = rutaDe(req.url);
  if (ruta === null) return;                 // otro origen u otro sitio de la cuenta
  if (esAsset(ruta)) e.respondWith(responderAsset(e, ruta));
  else if (req.mode === "navigate") e.respondWith(navegar(e));
  else e.respondWith(responderCodigo(e));
});

self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.tipo === "calentar" && Array.isArray(d.urls)) e.waitUntil(calentar(d.urls));
  /* la página pregunta qué versión es este worker (al cambiar de worker) */
  else if (d.tipo === "version?" && e.source && e.source.postMessage) e.source.postMessage({ tipo: "pampa-version", version: VERSION });
});
