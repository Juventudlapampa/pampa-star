/* ============================================================================
   PAMPA STAR · phaser/logic/carga.js — LA CARGA CON SEÑAL FLOJA (lógica pura)

   La meta de la tanda 1.0 es el celular de una localidad con mala señal.
   Este módulo junta lo que decide index.html alrededor de la red, sin DOM ni
   Phaser, para poder probarlo en node:

     · cuánto vino de la red en la sesión (window.__PAMPA_RED, se ve con
       ?perf=1). Lo cuentan dos: el service worker, que avisa lo que bajó
       de verdad (el transferSize de sus tiempos de recurso: un 304 cuenta
       sus pocos bytes) y cada respuesta que dio desde su caché, y la
       página, que suma lo que bajó sin pasar por él (la primera visita,
       antes de que el worker controle la página). Así se puede VER que un
       deploy nuevo no le hace bajar las poses de nuevo a quien ya jugó.
     · el reintento del loader de Phaser: un archivo que falla se vuelve a
       pedir una vez, y si falla otra vez se sigue (reintentarUnaVez).

   Lo prueban phaser/test/cache_versiones.test.js y red_lenta.test.js.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PampaCarga = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function nuevaCuenta() {
    return { bytes: 0, pedidos: 0, deCache: 0, directos: 0, topes: [], arranqueMs: null };
  }

  /* un aviso del service worker: { origen: "red", bytes, pedidos } (lo que
     bajó, en tandas) o { origen: "cache", ruta } (una respuesta de su caché) */
  function sumarRed(c, msg) {
    var m = msg || {};
    var deRed = m.origen === "red";
    var b = deRed ? Math.max(0, Number(m.bytes) || 0) : 0;
    var n = deRed ? Math.max(0, Math.round(Number(m.pedidos) || 0)) : 0;
    if (c) {
      c.bytes += b;
      c.pedidos += n;
      c.deCache += m.origen === "cache" ? 1 : 0;
    }
    return c;
  }

  /* una entrada de PerformanceResourceTiming: cuenta solo si NO pasó por el
     worker (workerStart 0) y vino de la red (transferSize > 0; la caché
     HTTP del navegador da 0). Lo que pasó por el worker ya lo contó él. */
  function sumarDirecto(c, entrada) {
    var e = entrada || {};
    var b = Number(e.transferSize) || 0;
    var cuenta = !(e.workerStart > 0) && b > 0;
    if (c && cuenta) { c.bytes += b; c.pedidos++; c.directos++; }
    return c;
  }

  function mb(b) { return (b / 1048576).toFixed(2).replace(".", ",") + " MB"; }

  /* el renglón de ?perf=1 */
  function textoRed(c) {
    if (!c) return "";
    var t = "RED " + mb(c.bytes) + " en " + c.pedidos + " pedidos · de la caché " + c.deCache;
    if (c.topes && c.topes.length) t += " · topes " + c.topes.length;
    if (c.arranqueMs != null) t += " · arrancó en " + (c.arranqueMs / 1000).toFixed(1).replace(".", ",") + " s";
    return t;
  }

  /* ═══ EL REINTENTO DEL LOADER DE PHASER (L05, arranque-con-senal-floja) ═══
     Antes los cuatro preload (intro, editor, master, partido) se tragaban el
     "loaderror" sin hacer nada: con una raya de señal, una pose que no bajaba
     al primer intento quedaba en el sprite de código toda la sesión. Ahora,
     la primera vez que un archivo falla (o vence el tope de
     balance.red_floja.loader_timeout_ms) se vuelve a encolar con la misma
     clave y la misma dirección; la segunda, se deja y el juego sigue con su
     respaldo. Se encola ADENTRO del aviso de error: Phaser lo emite antes de
     mirar si la carga terminó (LoaderPlugin.nextFile → fileProcessComplete),
     así que el archivo nuevo entra en la misma tanda.
     El registro vive en el cierre de cada preload, no en la escena: Phaser
     borra todos los oyentes del loader al apagar la escena
     (LoaderPlugin.shutdown → removeAllListeners), así que cada scene.start
     arranca de cero sin dejar memoria en la instancia (patrón P1).
     load: el LoaderPlugin (this.load). Devuelve { reintentados, perdidos }. */
  var HISTORIAL_MAX = 30;
  var historial = [];
  function anotar(que, f) {
    historial.push({ que: que, clave: f.key || "?", tipo: f.type || "?" });
    if (historial.length > HISTORIAL_MAX) historial.shift();
  }
  function reintentarUnaVez(load) {
    var vistos = {};
    var reg = { reintentados: [], perdidos: [] };
    if (!load || typeof load.on !== "function") return reg;
    load.on("loaderror", function (file) {
      var f = file || {};
      var id = (f.type || "?") + ":" + (f.key || "?");
      var encolar = f.type === "image" ? load.image : f.type === "json" ? load.json : null;
      if (!vistos[id] && encolar && f.key && typeof f.url === "string") {
        vistos[id] = true;
        reg.reintentados.push(f.key);
        anotar("reintento", f);
        encolar.call(load, f.key, f.url);
      } else {
        reg.perdidos.push(f.key);
        anotar("perdido", f);
      }
    });
    return reg;
  }

  return {
    nuevaCuenta: nuevaCuenta, sumarRed: sumarRed, sumarDirecto: sumarDirecto, textoRed: textoRed,
    reintentarUnaVez: reintentarUnaVez, historial: function () { return historial.slice(); }
  };
});
