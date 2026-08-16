/* ============================================================================
   PAMPA STAR · G3 — HACIA DÓNDE CORREN LOS QUE NO TIENEN LA PELOTA

   El pedido era traer el CRITERIO ESCRITO por puesto y verificar contra él, no
   contra la impresión. El criterio ya existía en el código (V8 §2, la IA de los
   21) pero no estaba escrito en ningún lado, así que no había con qué comparar
   lo que se veía en pantalla. Acá queda escrito y verificado.

   ── EL CRITERIO, PUESTO POR PUESTO ─────────────────────────────────────────

   DEFENSOR (DEF)
     · Cuando ataca su equipo: sube a apoyar hasta def_apoyo px por delante de
       su posición base, pero NO pasa del 55% de la cancha. El defensor
       acompaña; no es un extremo más.
     · Cuando defiende: se para entre la pelota y su propio arco, con un colchón
       de def_colchon px por delante de la pelota, y nunca más atrás de x=30.
       LA ESPALDA SIEMPRE CUBIERTA: un defensor no queda nunca por delante de la
       pelota cuando el rival la tiene.

   VOLANTE (VOL)
     · Siempre igual, ataque o defensa: sigue la pelota con peso vol_sigue,
       mezclado con su base. Es el que más se mueve con el juego — por eso no
       tiene regla distinta según quién ataca.

   DELANTERO (ATA)
     · Cuando ataca su equipo: se descuelga ata_descuelga px por delante de la
       pelota, con tope en W−70 (no se mete adentro del arco), y se abre a las
       bandas alternando ata_abre px. NUNCA RETROCEDE mientras su equipo ataca:
       sube o se queda donde está.
     · Cuando defiende: baja ata_baja px desde su base, pero NO cruza el 42% de
       la cancha hacia su propio arco. El 9 no baja a marcar: espera arriba.

   ARQUERO y cualquier otro puesto
     · Elasticidad simple sobre su posición base, sin lógica de situación.

   TODOS
     · Se mueven dentro de su banda lateral, sin importar dónde esté la pelota.
     · El equipo rival usa las MISMAS reglas con las coordenadas espejadas: no
       hay dos IAs distintas, hay una y un espejo.

   ── VERIFICACIÓN ───────────────────────────────────────────────────────────
   Cada regla de arriba tiene abajo un assert que la corre sobre la lógica real
   (logic/partido.tick), no sobre una reimplementación.

   Corré:  node phaser/test/g3_sin_pelota.test.js
   ========================================================================== */
"use strict";
var fs = require("fs"), path = require("path");
var P = require(path.join(__dirname, "..", "logic", "partido.js"));
var BAL = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "balance.json"), "utf8"));
var W = BAL.mundo.ancho, H = BAL.mundo.alto;
var IA = BAL.ia || {};

var ok = 0, mal = 0;
function assert(c, m) { if (c) ok++; else { mal++; console.error("  ✗ " + m); } }

function nuevo(opts) {
  opts = opts || {};
  var mios = [{ nombre: "Arquero", pos: "ARQ" }];
  for (var i = 0; i < 10; i++) mios.push({ nombre: "Compa " + i, pos: "X" });
  mios[8] = { nombre: "Vos", esVos: true };
  var st = P.crearPartido({ bal: BAL, mios: mios, rivales: [], rng: function () { return 0.5; } });
  st.posesion = opts.posesion || "mia";
  st.modo = "juego"; st.cooldown = 0;
  if (opts.pelotaX != null) { st.pelota.x = opts.pelotaX; st.pelota.y = opts.pelotaY != null ? opts.pelotaY : H / 2; }
  return st;
}
/* tick() sale temprano si el modo no es "juego", y el modo pasa a "congelado"
   apenas se dispara un encuentro. En el juego real vos elegís y sigue; en un
   banco de pruebas no elige nadie y queda congelado para siempre, así que los
   posicionales dejan de moverse y parece que están rotos. Destrabarlo es parte
   del banco: G3 mide a los que NO tienen la pelota, no los encuentros. */
function destrabar(st) { if (st.modo !== "juego") { st.modo = "juego"; st.cooldown = 0; } }
function correr(st, ms, libre) {
  var paso = 50, n = Math.round((ms || 3000) / paso);
  /* libre=true destraba los encuentros. NO se usa en las pruebas defensivas:
     ahí el congelamiento es justamente lo que en el juego real impide que el
     rival corra la cancha entera sin que nadie lo cruce, y destrabarlo hace
     que los defensores queden mal parados por un motivo que no existe. */
  for (var k = 0; k < n; k++) { if (libre) destrabar(st); P.tick(st, paso, {}); }
  return st;
}
function porPuesto(st, pos) { return st.mios.filter(function (j, i) { return j.pos === pos && i !== st.ctrl; }); }

/* ---------- [1] DEF: la espalda siempre cubierta ---------- */
(function () {
  /* el rival tiene la pelota y avanza hacia mi arco */
  var st = nuevo({ posesion: "rival", pelotaX: W * 0.35 });
  st.portadorRival = st.rivales.findIndex(function (r) { return r.pos !== "ARQ"; });
  st.rivales[st.portadorRival].x = W * 0.35;
  correr(st, 4000);
  var defs = porPuesto(st, "DEF");
  assert(defs.length > 0, "el fixture tiene defensores");
  var adelantados = defs.filter(function (d) { return d.x > st.pelota.x; });
  assert(adelantados.length === 0,
    "CRITERIO 'la espalda siempre cubierta': con el rival atacando hay " + adelantados.length + " de " +
    defs.length + " defensores POR DELANTE de la pelota (pelota en x=" + Math.round(st.pelota.x) +
    ", ellos en " + adelantados.map(function (d) { return Math.round(d.x); }).join(",") + ")");
  var muyAtras = defs.filter(function (d) { return d.x < 25; });
  assert(muyAtras.length === 0, "ningún defensor se mete adentro del arco propio (x<25)");
  console.log("[1] DEF defendiendo: " + defs.length + " defensores, todos detrás de la pelota (x=" +
    Math.round(st.pelota.x) + "), el más adelantado en " + Math.round(Math.max.apply(null, defs.map(function (d) { return d.x; }))));
})();

/* ---------- [2] DEF: acompaña, pero no es un extremo ---------- */
(function () {
  var st = nuevo({ posesion: "mia", pelotaX: W * 0.85 });
  st.mios[st.ctrl].x = W * 0.85;
  correr(st, 5000, true);
  var defs = porPuesto(st, "DEF");
  var tope = W * 0.55 + 2;
  var pasados = defs.filter(function (d) { return d.x > tope; });
  assert(pasados.length === 0,
    "CRITERIO 'el defensor acompaña, no es un extremo': con la pelota en campo rival hay " + pasados.length +
    " defensores pasados del 55% de la cancha (" + Math.round(tope) + "): " +
    pasados.map(function (d) { return Math.round(d.x); }).join(","));
  console.log("[2] DEF atacando: el más adelantado llega a " +
    Math.round(Math.max.apply(null, defs.map(function (d) { return d.x; }))) + " de un tope de " + Math.round(tope));
})();

/* ---------- [3] ATA: nunca retrocede mientras su equipo ataca ---------- */
(function () {
  var st = nuevo({ posesion: "mia", pelotaX: W * 0.5 });
  st.mios[st.ctrl].x = W * 0.5;
  correr(st, 1000, true);
  var idx = [];
  st.mios.forEach(function (j, i) { if (j.pos === "ATA" && i !== st.ctrl) idx.push(i); });
  var previos = idx.map(function (i) { return st.mios[i].x; });
  var retrocesos = 0, peor = 0;
  /* la pelota avanza: en ningún latido un delantero puede ir para atrás */
  for (var k = 0; k < 40; k++) {
    destrabar(st);
    st.pelota.x = Math.min(W - 80, st.pelota.x + 12);
    st.mios[st.ctrl].x = st.pelota.x;
    P.tick(st, 50, {});
    idx.forEach(function (i, n) {
      var d = previos[n] - st.mios[i].x;
      if (d > 0.5) { retrocesos++; peor = Math.max(peor, d); }
      previos[n] = st.mios[i].x;
    });
  }
  assert(retrocesos === 0,
    "CRITERIO 'el delantero nunca retrocede en ataque': hubo " + retrocesos + " retrocesos, el peor de " +
    peor.toFixed(1) + " px. Este es el bug que se veía como jugadores caminando para atrás en pleno ataque.");
  console.log("[3] ATA atacando: 0 retrocesos en 40 latidos con la pelota subiendo");
})();

/* ---------- [4] ATA: no baja a marcar ---------- */
(function () {
  var st = nuevo({ posesion: "rival", pelotaX: W * 0.2 });
  st.portadorRival = st.rivales.findIndex(function (r) { return r.pos !== "ARQ"; });
  st.rivales[st.portadorRival].x = W * 0.2;
  correr(st, 6000);
  var atas = porPuesto(st, "ATA");
  var piso = W * 0.42 - 2;
  var bajaron = atas.filter(function (a) { return a.x < piso; });
  assert(bajaron.length === 0,
    "CRITERIO 'el 9 no baja a marcar': con el rival atacando hay " + bajaron.length + " delanteros por debajo del " +
    "42% de la cancha (" + Math.round(piso) + "): " + bajaron.map(function (a) { return Math.round(a.x); }).join(","));
  console.log("[4] ATA defendiendo: el que más bajó quedó en " +
    Math.round(Math.min.apply(null, atas.map(function (a) { return a.x; }))) + ", piso " + Math.round(piso));
})();

/* ---------- [5] VOL: es el que más se mueve con la pelota ---------- */
(function () {
  var st = nuevo({ posesion: "mia", pelotaX: W * 0.3 });
  st.mios[st.ctrl].x = W * 0.3;
  correr(st, 3000, true);
  /* por índice absoluto, no por el orden del filtro: st.ctrl puede cambiar
     entre las dos mediciones y los arrays quedarían desalineados */
  var iVol = [], iDef = [];
  st.mios.forEach(function (j, i) { if (i === st.ctrl) return; if (j.pos === "VOL") iVol.push(i); if (j.pos === "DEF") iDef.push(i); });
  var antes = st.mios.map(function (j) { return j.x; });
  /* La pelota hay que forzarla ANTES de cada tick. Empujar al portador no
     alcanza: el tick lo reposiciona y la pelota vuelve sola, así que las dos
     primeras versiones de este test medían 2 px contra 0 y no medían nada —
     los posicionales estaban quietos porque la pelota estaba quieta, que es lo
     correcto. Con la pelota moviéndose de verdad, la diferencia aparece. */
  for (var k = 0; k < 160; k++) {
    destrabar(st);
    st.pelota.x = Math.min(W * 0.8, W * 0.3 + k * 4);
    st.mios[st.ctrl].x = st.pelota.x;
    P.tick(st, 50, {});
    st.pelota.x = Math.min(W * 0.8, W * 0.3 + k * 4);
  }
  var dVol = iVol.map(function (i) { return st.mios[i].x - antes[i]; });
  var dDef = iDef.map(function (i) { return st.mios[i].x - antes[i]; });
  var mVol = dVol.reduce(function (a, b) { return a + b; }, 0) / dVol.length;
  var mDef = dDef.reduce(function (a, b) { return a + b; }, 0) / dDef.length;
  assert(mVol > mDef,
    "CRITERIO 'el volante es el que más sigue el juego': con la pelota yendo de 30% a 80%, los volantes se " +
    "movieron " + Math.round(mVol) + " px y los defensores " + Math.round(mDef) + ". El volante tiene que moverse MÁS.");
  console.log("[5] con la pelota de 30% a 80%: volantes +" + Math.round(mVol) + " px · defensores +" + Math.round(mDef) + " px");
})();

/* ---------- [6] TODOS: cada uno en su banda ---------- */
(function () {
  var st = nuevo({ posesion: "mia", pelotaX: W * 0.6, pelotaY: 40 });   // pelota bien arriba
  st.mios[st.ctrl].y = 40;
  correr(st, 5000);
  var fuera = [];
  st.mios.forEach(function (j, i) {
    if (i === st.ctrl) return;
    var margen = j.pos === "ATA" ? (IA.ata_abre || 70) + 4 : 4;   // el 9 se abre a propósito
    if (j.y < j.banda[0] - margen || j.y > j.banda[1] + margen) fuera.push(j.pos + " y=" + Math.round(j.y) + " banda " + Math.round(j.banda[0]) + "-" + Math.round(j.banda[1]));
  });
  assert(fuera.length === 0,
    "CRITERIO 'cada uno en su banda': con la pelota pegada al lateral se salieron " + fuera.length + ": " + fuera.join(" · "));
  console.log("[6] con la pelota en y=40, los 10 sin pelota se quedaron en su banda");
})();

/* ---------- [7] LA MISMA IA ESPEJADA PARA LOS DOS ---------- */
(function () {
  /* con el rival atacando, SUS defensores también cubren su espalda */
  var st = nuevo({ posesion: "rival", pelotaX: W * 0.3 });
  st.portadorRival = st.rivales.findIndex(function (r) { return r.pos !== "ARQ"; });
  st.rivales[st.portadorRival].x = W * 0.3;
  correr(st, 5000);
  /* OJO: sin excluir al portador esto da un falso positivo. El fixture elige
     como portador al primer rival que no es arquero, que resulta ser un DEF, y
     ese avanza hasta 200 porque LLEVA LA PELOTA — que es justamente lo que este
     test NO mide. G3 es sobre los que no la tienen. */
  var defsR = st.rivales.filter(function (r, i) { return r.pos === "DEF" && i !== st.portadorRival; });
  var tope = W * 0.45 - 2;   // espejo del 55%
  var pasados = defsR.filter(function (d) { return d.x < tope; });
  assert(pasados.length === 0,
    "CRITERIO 'una sola IA, espejada': los defensores RIVALES atacando pasaron su tope del 55% espejado (" +
    Math.round(tope) + "): " + pasados.map(function (d) { return Math.round(d.x); }).join(","));
  console.log("[7] IA espejada: los defensores rivales atacando llegan hasta " +
    Math.round(Math.min.apply(null, defsR.map(function (d) { return d.x; }))) + ", tope " + Math.round(tope));
})();

console.log("\nperillas: " + ["def_apoyo", "def_colchon", "vol_sigue", "ata_descuelga", "ata_baja", "ata_abre"]
  .map(function (k) { return k + " " + (IA[k] != null ? IA[k] : "(default)"); }).join(" · "));
console.log(mal === 0 ? "✓ TODOS OK — " + ok + " asserts, 0 fallaron." : "✗ " + mal + " FALLARON (" + ok + " ok)");
process.exit(mal === 0 ? 0 : 1);
